export type VoiceRecorderControls = {
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  isRecording: () => boolean;
};

export function createVoiceRecorder(): VoiceRecorderControls {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;
  let recording = false;

  return {
    isRecording: () => recording,
    start: async () => {
      if (recording) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start();
      recording = true;
    },
    stop: () =>
      new Promise((resolve) => {
        if (!mediaRecorder || !recording) {
          resolve(null);
          return;
        }
        mediaRecorder.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop());
          recording = false;
          resolve(chunks.length ? new Blob(chunks, { type: "audio/webm" }) : null);
        };
        mediaRecorder.stop();
      }),
  };
}
