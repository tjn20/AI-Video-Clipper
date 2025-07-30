from concurrent.futures import ThreadPoolExecutor, as_completed
import glob
import cv2
import ffmpegcv
from modal import Image,App,Volume,enter,Secret,fastapi_endpoint,parameter
from fastapi import Depends,HTTPException,status
from fastapi.security import HTTPAuthorizationCredentials,HTTPBearer
from typing import Annotated
import numpy as np
import pysubs2
from models.requests import ProcessVidRequest
import os
from dotenv import load_dotenv
from uuid import uuid4
from pathlib import Path
import boto3
import whisperx
import subprocess
from openai import OpenAI
import json
import shutil
import pickle
load_dotenv()


docker_image:Image = (Image.from_registry("nvidia/cuda:12.4.0-devel-ubuntu22.04",add_python="3.12")
         .apt_install(["ffmpeg","libgl1-mesa-glx","wget","libcudnn8","libcudnn8-dev"])
         .pip_install_from_requirements("./requirements.txt")
         .run_commands(["mkdir -p /user/shar/fonts/truetype/custom","wget -O /user/shar/fonts/truetype/custom/PT_Sans-Caption-Regular.ttf https://github.com/google/fonts/blob/main/ofl/ptsanscaption/PT_Sans-Caption-Web-Regular.ttf","fc-cache -f -v"])
         .add_local_dir("./LR-ASD","/LR-ASD",copy=True)
         .add_local_python_source("models",copy=True))

volume:Volume = Volume.from_name(os.environ["MODAL_VOLUME_NAME"],create_if_missing=True)
mount_path:str = "/root/.cache/torch"

app: App = App(os.environ["APP_NAME"],image=docker_image)

auth_scheme = HTTPBearer()

identify_moments_or_disallow_system_prompt: str = ("""
Extract educational clips from a transcript of a podcast or instructional video.The transcript consists of words with each's start and end time.
Each clip should contain a complete educational unit, which may include: 
        a question and its answer, 
        a concept introduction or educational discussion.
<rules> 
  - If the content is casual, entertainment-focused, personal, or unrelated to education (e.g., general discussion without informative value), return: [{"response": "disallowed"}].
  - The transcript could include educational content however, there might be no valid clips to extract or clips that don't align with duration (30-60 seconds). Therefore, the output should be an empty list [], in JSON format.                                 
  - Do not include greetings, thank-yous, or casual/non-educational interactions.  
  - Ensure clips do not overlap with one another.
  - Optional context before the start of the segment is allowed for clarity.
  - Start and end timestamps must align with sentence boundaries in the transcript.
  - Only use the provided start and end timestamps. Modifying or generating new timestamps is not allowed.
  - Each clip must be strictly between 30 and 60 seconds in duration, ideally 40–60 seconds.
  - Include as much relevant context as possible without exceeding the 60-second limit.
  - For each clip, also include a short name or title (3–10 words) that summarizes the clip's educational content without mentioning the word clip, in addition to a catchy caption that is available to use on social platforms.                                            
  - Format the output as a python JSON list of objects with the following fields:
      [{"start": 10.010 seconds, "end": 40.010 seconds, "name": "short descriptive title","caption":"text"}, ...]
  - The output must be valid JSON parsable by Python's json.loads() function.
                                                   
</rules>
""")

transcript_translation_prompt: str = ("""
Translate the given transcript into the specified target language **only if** it is not already in that language. Ensure that the meaning and tone are preserved accurately.

The transcript consists of individual words, each with its own start and end timestamp.

Rules:
- If the target language matches the given transcript language, the output should be an empty list [], in JSON format.                    
- Do not alter or generate new timestamps — use only the provided start and end times.
- For each word, provide a translated equivalent, aligned with the original timestamps.
- Format the output as a JSON list of objects with the following structure:
  [
    {"start": 10.010, "end": 40.010, "word": "translated word"},
    ...
  ]
- The output must be valid JSON parsable by Python’s `json.loads()` function.
""")

@app.cls(gpu="L4",timeout=900,retries=0,scaledown_window=20,volumes={mount_path:volume},secrets=[Secret.from_dotenv("./")])
class AIClipper:
    __DEVICE = "cuda"

    
    @enter()
    def load_model(self):
        self.__whisperx_model = whisperx.load_model(
            os.environ["WHISPERX_MODEL"],
            device = AIClipper.__DEVICE,
            compute_type = "float16"
        )
        self.__openai_client = OpenAI()
        

    def __transcribe_vid(self,base_dir:Path,vid_path:str)-> list:
        # Extract the audio from the video
        audio_path = (base_dir / "audio.wav")
        audio_extraction_cmd = f"ffmpeg -i {vid_path} -vn -acodec pcm_s16le -ar 1600 -ac 1 {audio_path}"
        try:
            subprocess.run(audio_extraction_cmd,capture_output=True,check=True,shell=True)
        except subprocess.CalledProcessError as e:
            print("Something Went Wrong!")
        
        audio = whisperx.load_audio(str(audio_path))
        extracted_transcription = self.__whisperx_model.transcribe(audio,batch_size=16)
        alignment_model, metadata = whisperx.load_align_model(
            language_code=extracted_transcription["language"],
            device = AIClipper.__DEVICE
        )
        result = whisperx.align(
            extracted_transcription["segments"],
            alignment_model,
            metadata,
            audio,
            device=AIClipper.__DEVICE,
            return_char_alignments=False
        )

        segments:list= []
        if "word_segments" in result:
            for word_segment in result["word_segments"]:
                segments.append({
                    "start":word_segment["start"],
                    "end":word_segment["end"],
                    "word":word_segment["word"]
                })
        return segments
    
    def __identify_moments_or_disallow(self,transcript:list[dict[str, str]])->str | None:
        return (self.__openai_client.chat.completions.create(
            temperature=0.5,
            model=os.environ["OPENAI_MODEL"],
            messages=[
                {
                    "role":"system",
                    "content":identify_moments_or_disallow_system_prompt
                },
                {
                    "role":"user",
                    "content":"""
                        The following Transcript : \n\n 
                        """ + str(transcript)
                }
            ]
        )).choices[0].message.content
    
    def __translate_transcript(self,transcript:list[dict[str, str]],language:str) -> str | None:
            return (self.__openai_client.chat.completions.create(
            temperature=0.5,
            model=os.environ["OPENAI_MODEL"],
            messages=[
                {
                    "role":"system",
                    "content":transcript_translation_prompt
                },
                {
                    "role":"user",
                    "content":"""
                        The following Transcript : \n\n 
                        """ + str(transcript) + """\n\n Target Language: \n""" + language
                }
            ]
        )).choices[0].message.content
    
    def __create_vertical_video(self,tracks,scores,pyframes_path,pyavi_path,audio_path,vertical_clip_path)->None:
        video_dimensions = {
            "width":1080,
            "height":1920
        }
        clip_fps = 30
        flist = glob.glob(os.path.join(pyframes_path, "*.jpg"))
        flist.sort()
        faces = [[] for _ in range(len(flist))]
        print("tracks ",tracks)
        for tidx,track in enumerate(tracks):
            track_scores = scores[tidx]
            for fidx,frame in enumerate(track["track"]["frame"].tolist()):
                start = max(fidx - 30,0)
                end = min(fidx + 30,len(track_scores))     
                avg_score = float(np.mean(track_scores[start:end])) if len(track_scores[start:end]) > 0 else 0
                faces[frame].append({
                    'track':tidx,
                    'score':avg_score,
                    's':track["proc_track"]["s"][fidx],
                    'x':track["proc_track"]["x"][fidx],
                    'y':track["proc_track"]["y"][fidx],

                })
        
        temp_clip_path = str(pyavi_path / "video_only.mp4")
        vout = None
        for fidx,fname in enumerate(flist):
            image = cv2.imread(fname)
            if image is None:
                continue
            current_faces= faces[fidx]

            max_score_face = max(current_faces,key=lambda face:face["score"]) if current_faces else None
            if max_score_face and max_score_face['score'] < 0:
                max_score_face = None
            
            if not vout:
                vout = ffmpegcv.VideoWriterNV(
                    file=temp_clip_path,
                    fps=clip_fps,
                    resize=(video_dimensions["width"],video_dimensions["height"])
                    )
            if max_score_face:
                scale = video_dimensions["height"] / image.shape[0]
                resized_image = cv2.resize(image,None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
                f_w = resized_image.shape[1]
                center_x = int(max_score_face["x"] * scale if max_score_face else f_w // 2)
                top_x = max(min(center_x - video_dimensions["width"] // 2,f_w - video_dimensions["width"]),0)
                img_cropped = resized_image[0:video_dimensions["height"],top_x:top_x+video_dimensions["width"]]
                vout.write(img_cropped)
            else:
                #if self.generate_video:
                #    pass # Todo
                #else:
                img_w,img_h = image.shape[1],image.shape[0]
                scale = min(video_dimensions["width"] / img_w , video_dimensions["height"] / img_h)
                new_w = int(img_w * scale)
                new_h = int(img_h * scale)
                resized_image = cv2.resize(image,(new_w,new_h),interpolation=cv2.INTER_AREA)

                bg_scale = max(video_dimensions["width"] / img_w,video_dimensions["height"] / img_h)
                bg_w = int(img_w * bg_scale)
                bg_h = int(new_h * bg_scale)

                blurred_bg = cv2.resize(image,(bg_w,bg_h))
                blurred_bg = cv2.GaussianBlur(blurred_bg,(121,121),0)
                cropped_x = (bg_w - video_dimensions["width"]) // 2
                cropped_y = (bg_h - video_dimensions["height"]) // 2

                blurred_bg = blurred_bg[cropped_y:cropped_y + video_dimensions["height"],cropped_x:cropped_x + video_dimensions["width"]]
                center_y = (video_dimensions["height"] - new_h) // 2
                blurred_bg[center_y:center_y + new_h,:] = resized_image

                vout.write(blurred_bg)
        if vout:
            vout.release()
            
        create_clip_cmd = (f"ffmpeg -y -i {temp_clip_path} -i {audio_path} -c:v h264 -preset fast -crf 23 -c:a aac -b:a 128k {vertical_clip_path}")
        try:
            subprocess.run(create_clip_cmd,check=True,shell=True,text=True)
        except subprocess.CalledProcessError as e:
            print("Something Went Wrong!") 

    def __create_subtitles(self,clip_segments:list[dict[str,str]],moment:dict,original_clip_path:Path,subtitle_clip_output_path:Path,is_vertical_clip=True)-> None:     
        start_time = moment["start"]
        end_time = moment["end"]
        temp_dir = os.path.dirname(subtitle_clip_output_path)
        temp_subtitle_path = os.path.join(temp_dir ,"temp_subtitles.ass")
        subtitles:list[tuple[float,float,str]] = []
        current_words:list[str] = []
        current_start = current_end = None
        max_words = 5 # To fix later
        for segment in clip_segments:
            word = segment.get("word","").strip()
            segment_start = segment.get("start")
            segment_end = segment.get("end")
            if not word or None in (segment_start, segment_end):
                continue
            start = max(0.0,segment_start - start_time)
            end = max(0.0,segment_end - start_time)
            if end == 0:
                continue
            if not current_words:
                current_start = start
                current_end = end
                current_words = [word]
            elif len(current_words) >= max_words:
                subtitles.append((current_start, current_end, " ".join(current_words)))
                current_words = [word]
                current_start = start
                current_end = end
            else:
                current_words.append(word)
                current_end = end
        if current_words:
            subtitles.append((current_start, current_end, ' '.join(current_words)))
        
        subs = pysubs2.SSAFile()

        subs.info["WrapStyle"] = 0
        subs.info["ScaledBorderAndShadow"] = "yes"
        if is_vertical_clip:
            subs.info["PlayResX"] = 1080
            subs.info["PlayResY"] = 1920
        subs.info["ScriptType"] = "v4.00+"

        style_name = "Default"
        new_style = pysubs2.SSAStyle()
        new_style.fontname = self.subtitles_font_name
        new_style.fontsize = self.subtitles_font_size
        new_style.primarycolor = pysubs2.Color(255, 255, 255)
        new_style.outline = 2.0
        new_style.shadow = 2.0
        new_style.shadowcolor = pysubs2.Color(0, 0, 0, 128)
        if self.subtitles_alignment == "BOTTOM":
            alignment = pysubs2.Alignment.BOTTOM_CENTER
        elif self.subtitles_alignment == "TOP":
            alignment = pysubs2.Alignment.TOP_CENTER
        else:
            alignment = pysubs2.Alignment.MIDDLE_CENTER
        new_style.alignment = alignment
        new_style.marginl = 50
        new_style.marginr = 50
        new_style.marginv = 50
        new_style.spacing = 0.0

        subs.styles[style_name] = new_style

        for i, (start, end, text) in enumerate(subtitles):
            start_time = pysubs2.make_time(s=start)
            end_time = pysubs2.make_time(s=end)
            line = pysubs2.SSAEvent(
                start=start_time, end=end_time, text=text, style=style_name)
            subs.events.append(line)

        subs.save(temp_subtitle_path)

        ffmpeg_cmd = (f"ffmpeg -y -i {str(original_clip_path)} -vf \"ass={temp_subtitle_path}\" "
                    f"-c:v h264 -preset fast -crf 23 {str(subtitle_clip_output_path)}")
        try:
            subprocess.run(ffmpeg_cmd, shell=True, check=True)
        except subprocess.CalledProcessError as e:
            print("Something Went Wrong!") 
        
    def __process_clip(self,base_dir:Path,orginal_clip_path:str,s3_key:str,clip_name:str,moment:list,clip_segments:list[dict[str,str]])->None:
        clip_name = f"clip_{clip_name}"
        moment_start_time = moment["start"]
        moment_end_time = moment["end"]
        s3_key_dir = os.path.dirname(s3_key)
        new_s3_vertical_clip_key = f"{s3_key_dir}/{moment['name']}_vertical.mp4"
        new_s3_normal_clip_key = f"{s3_key_dir}/{moment['name']}.mp4"
        clip_dir = base_dir / clip_name
        clip_dir.mkdir(parents=True, exist_ok=True)
        segment_clip_path = clip_dir / f"{clip_name}.mp4"
        pyavi_path = clip_dir / "pyavi"
        vertical_clip_path = clip_dir / "pyavi" / f"{clip_name}_vertical_clip.mp4"   
        vertical_clip_with_subtitle_path = pyavi_path / f"{clip_name}_with_subtitles.mp4"
        pyframes_path = clip_dir / "pyframes"
        audio_path = clip_dir / "pyavi" / "audio.wav"
        new_clip_path = base_dir / f"{clip_name}.mp4"
        (clip_dir / "pywork").mkdir(exist_ok=True)
        pyframes_path.mkdir(exist_ok=True)
        pyavi_path.mkdir(exist_ok=True)

        clip_duration = moment_end_time - moment_start_time
        cut_clip_cmd = (f"ffmpeg -i {orginal_clip_path} -ss {moment_start_time} -t {clip_duration} "
                   f"{segment_clip_path}")
        extract_audio_cmd = (f"ffmpeg -i {segment_clip_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}")
        try:
            subprocess.run(cut_clip_cmd,capture_output=True,check=True,shell=True,text=True)
            subprocess.run(extract_audio_cmd,capture_output=True,check=True,shell=True)
        except subprocess.CalledProcessError as e:
            print("Something Went Wrong! in cut clip or extract audio")
        
        shutil.copy(segment_clip_path, new_clip_path)
        columbia_cmd = (f"python Columbia_test.py --videoName {clip_name} "
                        f"--videoFolder {str(base_dir)} "
                        f"--pretrainModel weight/finetuning_TalkSet.model")
        try:
            subprocess.run(columbia_cmd,cwd="/LR-ASD",shell=True)
        except subprocess.CalledProcessError as e:
            print("Something Went Wrong! in columbia")         

        tracks_path = clip_dir / "pywork" / "tracks.pckl"
        scores_path = clip_dir / "pywork" / "scores.pckl"

        if not tracks_path.exists() or not scores_path.exists():
            raise FileNotFoundError("No output found for the clip")
        
        with open(tracks_path,"rb") as f:
            tracks = pickle.load(f)

        with open(scores_path,"rb") as f:
            scores = pickle.load(f)   


        self.__create_vertical_video(tracks, scores, pyframes_path, pyavi_path, audio_path, vertical_clip_path)
        print("Before Final Vertical Clip Path")
        vertical_final_path = vertical_clip_path
        if self.add_subtitles_to_vertical_clip:
            self.__create_subtitles(clip_segments, moment, vertical_clip_path, vertical_clip_with_subtitle_path)
            vertical_final_path = vertical_clip_with_subtitle_path
        print("vertical clip path ",vertical_final_path)
        (boto3.client("s3")).upload_file(vertical_final_path, os.environ["AWS_BUCKET"], new_s3_vertical_clip_key)
        (boto3.client("s3")).upload_file(str(new_clip_path), os.environ["AWS_BUCKET"], new_s3_normal_clip_key)
        print("After AWS upload")


        
  

        
    def __process_clip_wrapper(self,args):
        base_dir, vid_path, s3_key, index, moment, clip_segments = args
        return self.__process_clip(base_dir, vid_path, s3_key, str(index), moment, clip_segments)    
        

    @fastapi_endpoint(method="POST")
    def process_vid(self,request:ProcessVidRequest,token:Annotated[HTTPAuthorizationCredentials, Depends(auth_scheme)]):
        s3_key = request.s3_key
        self.translate_to_language = request.translate_to_language
        self.subtitles_font_name = request.subtitles_font_name
        self.subtitles_font_size = request.subtitles_font_size
        self.add_subtitles_to_vertical_clip = request.add_subtitles_to_vertical_clip
        self.subtitles_alignment = request.subtitles_alignment
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="UnAuthorized",
                headers={
                    "WWW-Authenticate":"Bearer"
                }
            )
        temp_folder_id = str(uuid4())

        base_dir = Path("/temp/" + temp_folder_id)
        base_dir.mkdir(parents=True, exist_ok=True)

        vid_path = str(base_dir / "video.mp4")
        (boto3.client("s3")).download_file(os.environ["AWS_BUCKET"],s3_key,vid_path)
        transcript_segments:list[dict[str, str]]  = self.__transcribe_vid(base_dir,vid_path)
        
        identified_moments = self.__identify_moments_or_disallow(transcript_segments)
        
        if not identified_moments:
            return {
                "message":"Something Went Wrong!"
            }
        
        translated_transcript_segments = None
        if self.translate_to_language and self.add_subtitles_to_vertical_clip:
            print(self.translate_to_language)
            translated_transcript_segments = self.__translate_transcript(transcript_segments,self.translate_to_language)
            if translated_transcript_segments:
                translated_transcript_segments = translated_transcript_segments.strip()
                if translated_transcript_segments.startswith("```json"):
                    translated_transcript_segments = translated_transcript_segments[len("```json"):].strip()
                if translated_transcript_segments.endswith("```"):
                    translated_transcript_segments = translated_transcript_segments[:-len("```")].strip()
                try:
                    translated_transcript_segments = json.loads(translated_transcript_segments)
                    print("tranlated:\n")
                    print(translated_transcript_segments)
                except Exception as e:
                    print("something went wrong while translating")
                    translated_transcript_segments = None


        stripped_identified_moments = identified_moments.strip()
        if stripped_identified_moments.startswith("```json"):
            stripped_identified_moments = stripped_identified_moments[len("```json"):].strip()
        if stripped_identified_moments.endswith("```"):
            stripped_identified_moments = stripped_identified_moments[:-len("```")].strip()
        
        clipped_moments = json.loads(stripped_identified_moments)
        if clipped_moments and "response" in clipped_moments[0] and clipped_moments[0]["response"] == "disallowed":
                return {
                "message": "disallowed"
            }
        print("clips found ",clipped_moments)
        tasks = []
        available_seconds = request.credits * 60
        total_used = 0
        clip_taken = []
        for index,moment in enumerate(clipped_moments):
            if "start" in moment and "end" in moment and "name" in moment:
                duration = moment["end"] - moment["start"]
                if total_used + duration > available_seconds:
                    continue
                segments = translated_transcript_segments or transcript_segments
                clip_segments = [segment for segment in segments
                                    if segment.get("start") is not None
                                    and segment.get("end") is not None
                                    and segment.get("end") > moment["start"]
                                    and segment.get("start") < moment["end"]
                                    ]
                tasks.append((
                    base_dir,vid_path,s3_key,index,moment,clip_segments
                ))
                total_used += duration
                clip_taken.append(moment)
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(self.__process_clip_wrapper,task) for task in tasks]
            
        if base_dir.exists():
            shutil.rmtree(base_dir,ignore_errors=True)
        
        return {
            "segments": clip_taken,
            "totalClipsDuration":total_used
        }



        