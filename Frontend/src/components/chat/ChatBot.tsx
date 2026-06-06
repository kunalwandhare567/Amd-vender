import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Mic, MicOff, Image as ImageIcon, Paperclip, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  image?: string;
  file?: {
    name: string;
    content: string;
  };
}

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m the Supplier Sentinel AI Assistant, powered by Azure OpenAI. Ask me about supplier risks, performance, alerts, or anything else!',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsRecording(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedImage && !selectedFile) || isLoading) return;

    let messageText = inputValue;

    if (selectedFile) {
      messageText = `${inputValue ? inputValue + '\n\n' : ''}📄 File: ${selectedFile.name}\n\nContent:\n${selectedFile.content}`;
    } else if (!inputValue && selectedImage) {
      messageText = 'Analyze this image';
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      image: selectedImage || undefined,
      file: selectedFile || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setSelectedFile(null);
    setIsLoading(true);

    try {
      const payload: any = { message: messageText };
      if (imageToSend) {
        payload.image = imageToSend;
      }

      const response = await api.post('/chat', payload);
      const data = response.data;

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error connecting to the AI service. Please check the backend connection and Azure OpenAI configuration.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setInputValue('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDocumentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const content = reader.result as string;
        let extractedText = '';

        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          extractedText = content;
        } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(content);
            extractedText = JSON.stringify(jsonData, null, 2);
          } catch {
            extractedText = content;
          }
        } else if (file.name.endsWith('.csv')) {
          extractedText = content;
        } else {
          extractedText = `File type: ${file.type}\nFile uploaded successfully.`;
        }

        setSelectedFile({
          name: file.name,
          content: extractedText.slice(0, 5000),
        });
      };
      reader.readAsText(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Chat Icon Button - Bottom Right */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-16 h-16 shadow-2xl hover:shadow-3xl transition-shadow"
          size="icon"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-24 right-6 w-[90vw] md:w-[380px] h-[500px] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Supplier AI Assistant
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-primary/10 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Powered by Azure OpenAI</p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                          }`}
                      >
                        {message.image && (
                          <div className="mb-2">
                            <img
                              src={message.image}
                              alt="Uploaded"
                              className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                            />
                          </div>
                        )}
                        {message.file && (
                          <div className="mb-2 p-3 bg-background/50 rounded border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4" />
                              <span className="font-medium text-xs">{message.file.name}</span>
                            </div>
                            <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                              {message.file.content.slice(0, 300)}
                              {message.file.content.length > 300 && '...'}
                            </pre>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted rounded-lg p-4 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-background">
                {/* Image Preview */}
                {selectedImage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 relative inline-block"
                  >
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="rounded-lg max-h-32 object-cover border-2 border-primary"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {/* File Preview */}
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 p-3 bg-muted rounded-lg border-2 border-primary relative"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile.content.length} characters
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={removeFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".txt,.json,.csv,.md,text/plain,application/json"
                    onChange={handleDocumentSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="icon"
                    variant="outline"
                    className="h-10 w-10"
                    disabled={isRecording || isLoading}
                    title="Upload image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => documentInputRef.current?.click()}
                    size="icon"
                    variant="outline"
                    className="h-10 w-10"
                    disabled={isRecording || isLoading}
                    title="Upload document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isRecording ? "Listening..." : "Ask about suppliers..."}
                    className="flex-1 h-10"
                    disabled={isRecording || isLoading}
                  />
                  <Button
                    onClick={toggleRecording}
                    size="icon"
                    className={`h-10 w-10 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
                    variant={isRecording ? "default" : "outline"}
                    disabled={isLoading}
                    title="Voice input"
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="h-10 w-10"
                    disabled={isRecording || isLoading || (!inputValue.trim() && !selectedImage && !selectedFile)}
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {isRecording && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 mt-2 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Recording... Speak now
                  </motion.p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
