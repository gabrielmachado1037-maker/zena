import { useEffect, useRef, useState } from "react";

/**
 * Gravador de áudio (MediaRecorder) para mensagens de voz do chat.
 * `iniciar` pede o microfone e começa; `parar` finaliza e devolve o áudio como
 * data-URL base64 (pronto pra mandar no `anexoBase64`); `cancelar` descarta.
 */
export type EstadoGravacao = "idle" | "gravando";

export function useGravadorAudio() {
  const [estado, setEstado] = useState<EstadoGravacao>("idle");
  const [segundos, setSegundos] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function limpar() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function iniciar(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (t) => (MediaRecorder as any).isTypeSupported?.(t),
      );
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      mrRef.current = mr;
      setSegundos(0);
      setEstado("gravando");
      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      return true;
    } catch {
      limpar();
      return false;
    }
  }

  function parar(): Promise<string | null> {
    return new Promise((resolve) => {
      const mr = mrRef.current;
      if (!mr || mr.state === "inactive") { limpar(); setEstado("idle"); resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        limpar();
        setEstado("idle");
        setSegundos(0);
        if (blob.size === 0) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };
      mr.stop();
    });
  }

  function cancelar() {
    const mr = mrRef.current;
    if (mr && mr.state !== "inactive") { mr.onstop = null; try { mr.stop(); } catch { /* noop */ } }
    chunksRef.current = [];
    limpar();
    setEstado("idle");
    setSegundos(0);
  }

  useEffect(() => () => limpar(), []);

  return { estado, segundos, iniciar, parar, cancelar };
}

export function formatarDuracao(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
