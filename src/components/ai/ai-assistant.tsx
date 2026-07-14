import { useState, useEffect, useRef } from "react";
import { Sparkles, Mic, Volume2, VolumeX, X, Send, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendGeminiMessageAction } from "@/lib/ai/gemini.functions";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Handle textarea height adjustment
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // TTS clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize Speech Recognition on mount/client-side
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = (event: any) => {
        console.error("[AI Assistant Speech] Recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access denied. Please update your permissions.");
        } else {
          toast.error(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleMic = () => {
    if (!SpeechRecognition || !recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        // Stop active TTS
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setActiveSpeechId(null);
        }
        recognitionRef.current.start();
      } catch (err) {
        console.error("[AI Assistant Speech] Failed to start recognition:", err);
      }
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.length > 8000) {
      toast.error("Message exceeds maximum length of 8000 characters.");
      return;
    }

    // Stop active Speech Recognition & TTS
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
    }

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      id: crypto.randomUUID(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      // 1. Get access token from Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Unauthorized: Please log in again.");
      }

      // 2. Format conversation history (max 20 messages)
      const messageHistory = updatedMessages
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));

      // 3. Invoke secure server function
      const response = await sendGeminiMessageAction({
        data: {
          accessToken: session.access_token,
          messages: messageHistory,
        },
      });

      if (response.error) {
        toast.error(response.error);
        // Add error indicator message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${response.error}`,
            id: crypto.randomUUID(),
          },
        ]);
      } else if (response.text) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.text!,
            id: crypto.randomUUID(),
          },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "The AI assistant is temporarily unavailable.";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an authentication or connection error. Please try again.",
          id: crypto.randomUUID(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTTS = (text: string, messageId: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }

    if (activeSpeechId === messageId) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Remove any error prefix if reading error messages
    const cleanText = text.replace(/^Error:\s*/i, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = (e) => {
      console.error("[AI Assistant TTS] Utterance error:", e);
      setActiveSpeechId(null);
    };

    setActiveSpeechId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const handleReset = () => {
    setMessages([]);
    setInputText("");
    setIsLoading(false);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeechId(null);
    toast.success("AI conversation reset.");
  };

  const suggestions = [
    { label: "Draft a professional email", text: "Draft a polite email to my manager requesting project feedback." },
    { label: "Summarize text", text: "Summarize the following notes concisely:\n- [Insert your text here]" },
    { label: "Explain something", text: "Explain the difference between SQL and NoSQL databases like I am five." },
    { label: "Brainstorm ideas", text: "Brainstorm 5 creative talking points for an engineering team sync meeting." },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close ShareDesk AI" : "Open ShareDesk AI"}
        className={cn(
          "fixed z-50 flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer",
          // Position FAB offset on mobile (bottom-24) to avoid blocking the message composer, vertical center on desktop
          "bottom-24 right-4 lg:right-5 lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto",
          isOpen
            ? "bg-[#D94E3B] rotate-90 shadow-[0_0_20px_rgba(217,78,59,0.35)]"
            : "bg-gradient-to-br from-[#38A0FF] via-[#356DFF] to-[#6C3FF5] shadow-[0_0_20px_rgba(53,109,255,0.35)]"
        )}
      >
        {isOpen ? <X className="size-5" /> : <Sparkles className="size-5 animate-pulse" />}
      </button>

      {/* Drawer / Floating Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40 bg-card border-border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5",
            // Mobile (Full screen layout with safe margin top), Tablet (bottom right), Desktop (vertical center next to FAB)
            "inset-x-0 bottom-0 top-[60px] md:top-auto md:bottom-24 md:right-6 md:left-auto md:w-[400px] md:h-[600px] md:max-h-[80vh] md:rounded-2xl md:border lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-20 lg:h-[600px] lg:max-h-[85vh]"
          )}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-border bg-muted/20 px-4 py-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">ShareDesk AI</h3>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Powered by Gemini
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                aria-label="Reset conversation"
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant"
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 animate-in fade-in duration-300">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <h4 className="text-lg font-bold tracking-tight text-foreground">How can I help?</h4>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Ask ShareDesk AI to write, explain, summarize, brainstorm, or help with your work.
                </p>

                <div className="mt-6 w-full space-y-2 max-w-[340px]">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s.text)}
                      className="w-full text-left text-xs bg-muted/40 hover:bg-muted/95 border border-border/80 px-3.5 py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer text-foreground font-medium"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Message list
              <div className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col max-w-[85%] rounded-2xl p-3 text-sm shadow-sm relative group",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
                        : "bg-muted/70 text-foreground mr-auto rounded-tl-none border border-border/60"
                    )}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed break-words">{m.content}</div>

                    {/* Speaker Button on Assistant Message */}
                    {m.role === "assistant" && !m.content.startsWith("Error:") && (
                      <button
                        onClick={() => handleTTS(m.content, m.id)}
                        aria-label={activeSpeechId === m.id ? "Stop voice output" : "Read message aloud"}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded bg-card/80 border border-border/40 cursor-pointer"
                      >
                        {activeSpeechId === m.id ? (
                          <VolumeX className="size-3.5 animate-pulse text-destructive" />
                        ) : (
                          <Volume2 className="size-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 bg-muted/40 text-muted-foreground rounded-2xl rounded-tl-none p-3 text-sm border border-border/40 mr-auto max-w-[85%] shadow-sm animate-pulse">
                    <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                    <span>ShareDesk AI is writing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3 bg-muted/10 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex items-end gap-2 bg-card border border-border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputText);
                  }
                }}
                placeholder="Ask ShareDesk AI..."
                className="flex-1 resize-none bg-transparent py-1.5 focus:outline-none text-sm leading-relaxed max-h-[120px] text-foreground"
                disabled={isLoading}
              />

              <div className="flex items-center gap-1.5">
                {/* Voice Input Button */}
                {SpeechRecognition && (
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer",
                      isListening
                        ? "bg-destructive/15 text-destructive border-destructive/20 animate-pulse"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                    )}
                    disabled={isLoading}
                  >
                    <Mic className={cn("size-4", isListening && "scale-110")} />
                  </button>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  aria-label="Send message"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow transition-all cursor-pointer",
                    (!inputText.trim() || isLoading) && "opacity-40 cursor-not-allowed"
                  )}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
