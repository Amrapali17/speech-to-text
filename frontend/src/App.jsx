import { useState, useRef, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import {
  FiMic,
  FiUpload,
  FiTrash2,
  FiMoon,
  FiSun,
  FiX,
  FiCopy,
  FiSearch
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const [file, setFile] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [audioURL, setAudioURL] = useState(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriberRef = useRef(null);

  // API endpoint
  const API_BASE = "https://speech-to-text-1-gt9q.onrender.com";

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/transcripts`);
      setHistory(res.data);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const fetchLatestTranscript = async () => {
    try {
      const res = await axios.get(`${API_BASE}/transcripts`);
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        setTranscription(latest.transcription);
        showToast("Loaded latest transcript!", "success");
      } else {
        showToast("No transcripts found.", "error");
      }
    } catch (err) {
      console.error("Latest transcript fetch error:", err);
      showToast("Failed to fetch latest transcript.", "error");
    }
  };

  const deleteTranscript = async (id) => {
    try {
      await axios.delete(`${API_BASE}/transcripts/${id}`);
      setHistory((prev) => prev.filter((t) => t.id !== id));
      showToast("Transcript deleted!", "success");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete transcript.", "error");
    }
  };

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setAudioURL(null);
    setTranscription("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select or record audio first.");
      return;
    }
    setLoading(true);
    setProgress(0);
    setError("");
    setTranscription("");
    showToast("Transcription started...");

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("language", "en-US"); // Always English

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const p = Math.round((e.loaded * 100) / e.total);
          setProgress(p);
        },
      });

      const text = res.data.text || "No transcription found.";
      setTranscription(text);
      fetchHistory();
      fetchLatestTranscript();
      showToast("Transcription completed!", "success");
    } catch (err) {
      console.error("Transcription error:", err);
      setError("Failed to transcribe audio.");
      showToast("Failed to transcribe.", "error");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        clearInterval(timerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
        });
        setFile(audioFile);
        setAudioURL(URL.createObjectURL(audioBlob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      showToast("Recording started", "success");

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      showToast("Recording stopped", "info");
    }
  };

  const toggleLiveTranscription = () => {
    if (!("webkitSpeechRecognition" in window)) {
      setError("Live transcription only works in Chrome.");
      return;
    }

    if (isLiveTranscribing) {
      recognitionRef.current.stop();
      setIsLiveTranscribing(false);
      showToast("Live captions stopped", "info");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US"; // Always English

    recognition.onresult = (event) => {
      let liveText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        liveText += event.results[i][0].transcript;
      }
      setTranscription(liveText);
    };

    recognition.onerror = (e) =>
      setError(`Speech recognition error: ${e.error}`);

    recognition.start();
    recognitionRef.current = recognition;
    setIsLiveTranscribing(true);
    showToast("Live captions started", "success");
  };

  const downloadTranscript = (format = "txt") => {
    if (!transcription) return;

    if (format === "txt") {
      const blob = new Blob([transcription], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transcription.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(transcription, 10, 10);
      doc.save("transcription.pdf");
    } else if (format === "copy") {
      navigator.clipboard.writeText(transcription);
      showToast("Copied to clipboard!", "success");
    }
  };

  const clearAll = () => {
    setFile(null);
    setAudioURL(null);
    setTranscription("");
    setError("");
    showToast("Cleared all", "info");
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const scrollToTranscriber = () =>
    transcriberRef.current?.scrollIntoView({ behavior: "smooth" });

  const filteredHistory = history.filter((item) =>
    item.transcription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-between pt-20 p-6 transition-colors duration-500 ${
        darkMode ? "bg-gray-900 text-white" : "text-gray-800"
      }`}
      style={{
        background: darkMode
          ? "linear-gradient(to bottom right, #1a1a1a, #333)"
          : "linear-gradient(135deg, #EEF6FB, #CDE9F6)",
      }}
    >
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 shadow-md px-8 py-4 flex justify-between items-center ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
        }`}
      >
        <div
          className="text-2xl font-bold cursor-pointer"
          onClick={scrollToTranscriber}
        >
          🎤 Speech-to-Text
        </div>
        <div className="flex gap-6 items-center">
          <button
            onClick={scrollToTranscriber}
            className="hover:text-blue-500 transition"
          >
            Home
          </button>
          <button
            onClick={() => {
              fetchHistory();
              setShowHistory(true);
            }}
            className="hover:text-blue-500 transition"
          >
            History
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-700 text-black hover:bg-gray-500 transition"
          >
            {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>
      </nav>

      {/* Toasts */}
      <div className="fixed top-20 right-4 space-y-3 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow-lg ${
              toast.type === "success"
                ? "bg-green-500"
                : toast.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
            } text-white text-lg`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Main Transcriber */}
      <div
        ref={transcriberRef}
        className="w-[85%] h-[85vh] rounded-3xl shadow-2xl border flex flex-col items-center p-10 relative"
        style={{
          backgroundColor: darkMode ? "#1f2937" : "#FFFFFF",
          borderColor: "#CDE9F6",
        }}
      >
        {isRecording && (
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-semibold">
              Recording {formatTime(recordingTime)}
            </span>
          </div>
        )}

        <h1 className="text-4xl font-extrabold tracking-wide mb-10 text-gray-700">
          🎤 Speech-to-Text Converter
        </h1>

        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="mb-8 block w-2/3 text-lg border border-gray-400 rounded-xl p-4"
        />

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-[#1E90FF] hover:bg-blue-600 text-white text-xl font-semibold px-8 py-4 rounded-full shadow-lg flex items-center gap-3 transition-transform transform hover:scale-110"
            >
              <FiMic /> Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 text-white text-xl font-semibold px-8 py-4 rounded-full shadow-lg flex items-center gap-3 transition-transform transform hover:scale-110"
            >
              <FiMic /> Stop Recording
            </button>
          )}

          <button
            onClick={toggleLiveTranscription}
            className="bg-[#20B2AA] hover:bg-teal-600 text-white text-xl font-semibold px-8 py-4 rounded-full shadow-lg flex items-center gap-3 transition-transform transform hover:scale-110"
          >
            {isLiveTranscribing ? "Stop Live Captions" : "Start Live Captions"}
          </button>

          <button
            onClick={clearAll}
            className="bg-[#444444] hover:bg-black text-white text-xl font-semibold px-8 py-4 rounded-full shadow-lg flex items-center gap-3 transition-transform transform hover:scale-110"
          >
            <FiTrash2 /> Clear
          </button>
        </div>

        {audioURL && (
          <audio controls className="mb-8 w-2/3 rounded-md shadow-md">
            <source src={audioURL} type="audio/webm" />
          </audio>
        )}

        {loading && (
          <div className="w-2/3 h-4 bg-gray-300 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        <button
          onClick={handleUpload}
          className="bg-[#00796B] hover:bg-green-800 text-white text-2xl font-bold px-12 py-5 rounded-full shadow-xl transition-transform transform hover:scale-110 mb-6 flex items-center gap-3"
        >
          <FiUpload /> Transcribe Audio
        </button>

        {error && <p className="text-red-600 text-xl mt-4">{error}</p>}

        {transcription && (
          <div
            className="w-full max-w-4xl flex-1 overflow-y-auto border border-gray-300 rounded-2xl shadow-inner p-6 mt-6"
            style={{ backgroundColor: darkMode ? "#374151" : "#F7FBFD" }}
          >
            <h2 className="text-3xl font-bold mb-4">Transcription:</h2>
            <p className="text-xl leading-relaxed">{transcription}</p>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => downloadTranscript("txt")}
                className="bg-green-600 hover:bg-green-700 text-white text-lg px-6 py-3 rounded-full shadow-lg"
              >
                Download TXT
              </button>
              <button
                onClick={() => downloadTranscript("pdf")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-6 py-3 rounded-full shadow-lg"
              >
                Download PDF
              </button>
              <button
                onClick={() => downloadTranscript("copy")}
                className="bg-gray-600 hover:bg-gray-700 text-white text-lg px-6 py-3 rounded-full shadow-lg"
              >
                <FiCopy /> Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40"
              onClick={() => setShowHistory(false)}
            ></div>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className={`fixed top-0 right-0 h-full w-96 z-50 shadow-2xl border-l ${
                darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              }`}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-bold">Past Transcriptions</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-red-500 hover:text-red-700 text-lg font-semibold"
                >
                  <FiX />
                </button>
              </div>
              <div className="p-4">
                <button
                  onClick={fetchLatestTranscript}
                  className="mb-4 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md"
                >
                  Show Last Transcript
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <FiSearch />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transcripts..."
                    className="flex-1 border p-2 rounded"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 max-h-[70vh]">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg shadow-md relative ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <button
                          onClick={() => deleteTranscript(item.id)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <FiTrash2 />
                        </button>
                        <p className="text-sm">{item.transcription}</p>
                        <small className="block text-gray-400 mt-2">
                          {item.created_at || item.createdAt
                            ? new Date(item.created_at || item.createdAt).toLocaleString()
                            : "No Date Available"}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No transcripts found.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
