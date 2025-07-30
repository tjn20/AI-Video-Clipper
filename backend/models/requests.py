from pydantic import BaseModel
from typing import Literal

class ProcessVidRequest(BaseModel):
    s3_key:str
    credits:int
    translate_to_language:Literal["arabic","english","french"] | None = None
    subtitles_font_name: Literal["Sans-Caption-Regular","Arial"] = "Sans-Caption-Regular"
    subtitles_font_size:Literal[120,100,110] = 120 
    add_subtitles_to_vertical_clip:bool | None = True
    subtitles_alignment: Literal["TOP","BOTTOM","CENTER"] = "BOTTOM"
    

