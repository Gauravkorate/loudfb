export class AudioScorer {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.volumeHistory = []; 
    this.isRecording = false;
  }

  async start() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    this.microphone = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.microphone.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.volumeHistory = [];
    this.isRecording = true;

    this.trackLoop();
  }

  trackLoop() {
    if (!this.isRecording) return;
    this.analyser.getByteFrequencyData(this.dataArray);
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
    
    const volume = sum / this.dataArray.length;
    this.volumeHistory.push(volume);

    requestAnimationFrame(() => this.trackLoop());
  }

  stopAndGetFinalScore() {
    this.isRecording = false;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    if (this.volumeHistory.length === 0) return 0;

    const totalVolume = this.volumeHistory.reduce((a, b) => a + b, 0);
    const avgVolume = totalVolume / this.volumeHistory.length;
    
    // Perfectly accurate volume mapping multiplied by 10 for a high score feel
    return Math.round(avgVolume * 10);
  }
}