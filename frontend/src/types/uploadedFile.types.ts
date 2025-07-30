export interface Clip {
  start: number;
  end: number;
  name: string;
  caption: string;
}

interface SucessfulFileUpload {
  segments: Clip[];
  totalClipsDuration: number;
}

export interface DBClip {
  name: string;
  caption: string;
  duration: number;
}
interface UnSuccessfulFileUpload {
  message: string;
}

export type FileUpload = SucessfulFileUpload | UnSuccessfulFileUpload;
