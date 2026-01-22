// Auth Manager
        class AuthManager {
            constructor() {
                // Persist login across refresh using user_id in localStorage.
                this.userId = localStorage.getItem('user_id');
                this.isLoginMode = true;
                this.init();
            }

            init() {
                const authModal = document.getElementById('authModal');
                const mainContainer = document.getElementById('mainContainer');
                const authForm = document.getElementById('authForm');
                const authSwitchLink = document.getElementById('authSwitchLink');
                const authTitle = document.getElementById('authTitle');
                const authSubmit = document.getElementById('authSubmit');
                const nameField = document.getElementById('nameField');
                const authError = document.getElementById('authError');
                
                // Password toggle functionality
                const passwordToggle = document.getElementById('passwordToggle');
                const passwordInput = document.getElementById('authPassword');
                const eyeIcon = document.getElementById('eyeIcon');
                const eyeOffIcon = document.getElementById('eyeOffIcon');
                
                if (passwordToggle && passwordInput) {
                    passwordToggle.addEventListener('click', () => {
                        if (passwordInput.type === 'password') {
                            passwordInput.type = 'text';
                            eyeIcon.style.display = 'none';
                            eyeOffIcon.style.display = 'block';
                        } else {
                            passwordInput.type = 'password';
                            eyeIcon.style.display = 'block';
                            eyeOffIcon.style.display = 'none';
                        }
                    });
                }

                // Handle form submission
                const handleSubmit = async (e) => {
                    if (e) e.preventDefault();
                    console.log('Form submitted, isLoginMode:', this.isLoginMode);
                    authError.style.display = 'none';
                    
                    const email = document.getElementById('authEmail')?.value.trim();
                    const password = document.getElementById('authPassword')?.value;
                    const name = document.getElementById('authName')?.value.trim();

                    console.log('Form values:', { email, password: password ? '***' : '', name, isLoginMode: this.isLoginMode });

                    // Validation
                    if (!email || !password) {
                        authError.textContent = 'Please fill in all fields';
                        authError.style.display = 'block';
                        return;
                    }

                    if (!this.isLoginMode && !name) {
                        authError.textContent = 'Please enter your name';
                        authError.style.display = 'block';
                        return;
                    }

                    // Disable submit button
                    if (authSubmit) {
                        authSubmit.disabled = true;
                        authSubmit.textContent = this.isLoginMode ? 'Logging in...' : 'Signing up...';
                    }

                    try {
                        console.log('Calling login/register...');
                        if (this.isLoginMode) {
                            await this.login(email, password);
                        } else {
                            await this.register(name, email, password);
                        }
                        console.log('Login/register successful');
                    } catch (error) {
                        console.error('Login/register error:', error);
                        authError.textContent = error.message || 'An error occurred';
                        authError.style.display = 'block';
                    } finally {
                        if (authSubmit) {
                            authSubmit.disabled = false;
                            authSubmit.textContent = this.isLoginMode ? 'Login' : 'Sign Up';
                        }
                    }
                };

                // Form submission
                if (authForm) {
                    authForm.addEventListener('submit', handleSubmit);
                } else {
                    console.error('Auth form not found!');
                }

                // Also add click handler to button as backup (only if form submit doesn't work)
                if (authSubmit) {
                    authSubmit.addEventListener('click', (e) => {
                        // Only handle if form submit didn't work
                        const form = authSubmit.closest('form');
                        if (form) {
                            // Let form submit handle it
                            return;
                        }
                        e.preventDefault();
                        handleSubmit(null);
                    });
                }

                // Switch between login/register
                authSwitchLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.isLoginMode = !this.isLoginMode;
                    if (this.isLoginMode) {
                        authTitle.textContent = 'Login';
                        authSubmit.textContent = 'Login';
                        nameField.style.display = 'none';
                        document.getElementById('authSwitchText').textContent = "Don't have an account? ";
                        authSwitchLink.textContent = 'Sign up';
                    } else {
                        authTitle.textContent = 'Sign Up';
                        authSubmit.textContent = 'Sign Up';
                        nameField.style.display = 'block';
                        document.getElementById('authSwitchText').textContent = 'Already have an account? ';
                        authSwitchLink.textContent = 'Login';
                    }
                    authError.style.display = 'none';
                });

                // If user_id already exists (page refresh), show main app directly
                if (this.userId) {
                    this.showMain();
                }
            }

            async login(email, password) {
                console.log('Login called with:', { email, password: '***' });
                try {
                    const response = await fetch('http://localhost:8000/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    console.log('Login response status:', response.status);

                    if (!response.ok) {
                        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
                        console.error('Login error:', error);
                        throw new Error(error.detail || 'Login failed');
                    }

                    const data = await response.json();
                    console.log('Login response data:', data);
                    
                    if (!data.user_id) {
                        throw new Error('No user ID received from server');
                    }
                    
                    this.userId = data.user_id;
                    localStorage.setItem('user_id', this.userId);
                    console.log('Login successful, showing main');
                    this.showMain();
                } catch (error) {
                    console.error('Login exception:', error);
                    throw error;
                }
            }

            async register(name, email, password) {
                const response = await fetch('http://localhost:8000/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Registration failed');
                }

                const data = await response.json();
                this.userId = data.user_id;
                localStorage.setItem('user_id', this.userId);
                this.showMain();
            }

            logout() {
                // Just clean up - session saving is handled by ChatBot logout button
                this.userId = null;
                localStorage.removeItem('user_id');
                document.getElementById('authModal').classList.add('active');
                document.getElementById('mainContainer').style.display = 'none';

                // Stop mic stream on logout (release microphone)
                if (window.chatBot && window.chatBot.micStream) {
                    try {
                        window.chatBot.micStream.getTracks().forEach(t => t.stop());
                    } catch (_) {}
                    window.chatBot.micStream = null;
                    window.chatBot.micPermissionGranted = false;
                }
            }

            showMain() {
                document.getElementById('authModal').classList.remove('active');
                document.getElementById('mainContainer').style.display = 'block';
                
                // Clear any existing chat messages when showing main (new user login)
                if (window.chatBot) {
                    console.log('showMain called, clearing chat and loading session for user_id:', this.userId);
                    // Clear messages FIRST - important to prevent showing wrong user's messages
                    window.chatBot.messages = [];
                    window.chatBot.currentSessionId = null;
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '<div class="empty-state"><p>👋 Start a conversation by typing a message below</p></div>';
                    }
                    // Then load active session for the CURRENT user (using this.userId)
                    // Use setTimeout to ensure UI is cleared before loading
                    setTimeout(() => {
                        if (this.userId && window.chatBot) {
                            window.chatBot.loadActiveSession();
                        }
                    }, 100);
                }
            }
        }

        // Main ChatBot Class
        class ChatBot {
            constructor(authManager) {
                this.authManager = authManager;
                this.messages = [];
                this.isProcessing = false;
                this.currentSessionId = null; // Track current active session
                this.apiUrl = 'http://localhost:8000/chat';
                this.saveSessionUrl = 'http://localhost:8000/save-session';
                this.activeSessionUrl = 'http://localhost:8000/active-session';
                this.updateSessionUrl = 'http://localhost:8000/update-session';
                
                // DOM Elements
                this.chatMessages = document.getElementById('chatMessages');
                this.messageInput = document.getElementById('messageInput');
                this.chatForm = document.getElementById('chatForm');
                this.sendBtn = document.getElementById('sendBtn');
                this.sendBtnText = document.getElementById('sendBtnText');
                this.clearBtn = document.getElementById('clearBtn');
                this.logoutBtn = document.getElementById('logoutBtn');
                this.micBtn = document.getElementById('micBtn');
                
                // Speech Recognition (STT)
                this.recognition = null;
                this.isListening = false;
                this.micPermissionGranted = false;
                this.micStream = null;
                this.initSpeechRecognition();
                this.requestMicrophonePermission();
                
                // Save session on refresh (without summary)
                window.addEventListener('beforeunload', () => {
                    if (this.messages.length > 0 && this.authManager.userId) {
                        // Use sendBeacon for reliable save on page unload
                        const data = JSON.stringify({
                            messages: this.messages,
                            user_id: parseInt(this.authManager.userId),
                            generate_summary: false
                        });
                        navigator.sendBeacon(this.saveSessionUrl, new Blob([data], { type: 'application/json' }));
                    }
                });
                
                // Also save on visibility change (tab switch)
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden && this.messages.length > 0 && this.authManager.userId) {
                        this.saveSessionDraft();
                    }
                });
                
                this.init();
            }

            async requestMicrophonePermission() {
                // IMPORTANT:
                // - Mic permission persistence is controlled by the browser.
                // - Our job is to NOT re-request getUserMedia on every mic click.
                //
                // Also, if you're opening the frontend via file://, Chrome may behave oddly.
                // Serve it via http://localhost (python -m http.server) for best results.

                if (location.protocol === 'file:') {
                    // file:// protocol doesn't support getUserMedia
                    return;
                }

                // Best-effort: check Permissions API first (if supported)
                try {
                    if (navigator.permissions && navigator.permissions.query) {
                        const status = await navigator.permissions.query({ name: 'microphone' });
                        if (status.state === 'granted') {
                            this.micPermissionGranted = true;
                            return;
                        }
                    }
                } catch (_) {
                    // ignore - not supported in some browsers
                }

                // If already have a stream, permission is effectively granted for this session
                if (this.micStream) {
                    this.micPermissionGranted = true;
                    return;
                }

                try {
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        // Keep the stream open for the session to prevent repeated prompts
                        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        this.micPermissionGranted = true;
                    } else {
                        this.micPermissionGranted = false;
                    }
                } catch (error) {
                    this.micPermissionGranted = false;
                }
            }

            initSpeechRecognition() {
                // Check browser support
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                
                if (!SpeechRecognition) {
                    console.warn('Speech Recognition not supported in this browser');
                    if (this.micBtn) {
                        this.micBtn.disabled = true;
                        this.micBtn.title = 'Speech Recognition not supported';
                    }
                    return;
                }
                
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US'; // Can be changed to 'hi-IN' for Hindi
                
                this.recognition.onstart = () => {
                    this.isListening = true;
                    this.micBtn.classList.add('active');
                    this.messageInput.placeholder = 'Listening...';
                };
                
                this.recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    this.messageInput.value = transcript;
                    // Auto-send voice input
                    this.handleSubmit(null, transcript);
                    
                    // Don't call stopListening here - let onend handle it
                    this.isListening = false;
                    this.micBtn.classList.remove('active');
                    this.messageInput.placeholder = 'Type your message or click mic to speak...';
                };
                
                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    
                    // Reset state
                    this.isListening = false;
                    this.micBtn.classList.remove('active');
                    this.messageInput.placeholder = 'Type your message or click mic to speak...';
                    
                    // Don't call stop() if it already ended
                    if (event.error !== 'aborted' && event.error !== 'no-speech') {
                        try {
                            this.recognition.stop();
                        } catch (e) {
                            // Ignore - might already be stopped
                        }
                    }
                    
                    if (event.error === 'no-speech') {
                        // Don't show error for no-speech, just reset
                        console.log('No speech detected');
                    } else if (event.error === 'not-allowed') {
                        this.showError('Microphone permission denied. Please enable it in browser settings.');
                    } else if (event.error !== 'aborted') {
                        this.showError('Speech recognition error: ' + event.error);
                    }
                };
                
                this.recognition.onend = () => {
                    // Recognition ended naturally, just reset state
                    this.isListening = false;
                    this.micBtn.classList.remove('active');
                    this.messageInput.placeholder = 'Type your message or click mic to speak...';
                };
            }

            async startListening() {
                if (!this.recognition) {
                    this.showError('Speech Recognition is not supported in your browser');
                    return;
                }
                
                if (this.isListening) {
                    // Stop if already listening
                    try {
                        this.recognition.stop();
                    } catch (e) {
                        // Ignore if already stopped
                    }
                    this.isListening = false;
                    this.micBtn.classList.remove('active');
                    this.messageInput.placeholder = 'Type your message or click mic to speak...';
                    return;
                }
                
                if (this.isProcessing) {
                    this.showError('Please wait for the current request to complete');
                    return;
                }
                
                // Ensure permission is obtained once; don't prompt on every click.
                if (!this.micPermissionGranted) {
                    await this.requestMicrophonePermission();
                    if (!this.micPermissionGranted) {
                        this.showError('Microphone permission denied. Please allow microphone access in browser settings.');
                        return;
                    }
                }
                
                // Check if recognition is already running (some browsers)
                try {
                    // Try to start - will throw if already running
                    this.recognition.start();
                } catch (error) {
                    // If already started, just update state
                    if (error.name === 'InvalidStateError' || error.message.includes('already started')) {
                        this.isListening = true;
                        this.micBtn.classList.add('active');
                        this.messageInput.placeholder = 'Listening...';
                    } else {
                        console.error('Error starting recognition:', error);
                        this.showError('Could not start speech recognition. Please try again.');
                    }
                }
            }

            stopListening() {
                if (this.recognition) {
                    try {
                        // Only stop if actually listening
                        if (this.isListening) {
                            this.recognition.stop();
                        }
                    } catch (error) {
                        // Ignore errors when stopping (might already be stopped)
                    }
                }
                this.isListening = false;
                if (this.micBtn) {
                    this.micBtn.classList.remove('active');
                }
                if (this.messageInput) {
                    this.messageInput.placeholder = 'Type your message or click mic to speak...';
                }
            }

            async init() {
                // Don't load session here - it will be loaded when user logs in via showMain()
                // This prevents loading wrong user's session on page load
                
                // Event listeners
                this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
                this.clearBtn.addEventListener('click', () => this.clearChat());
                this.logoutBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to logout?')) {
                        this.saveSession(true).then(() => {
                            this.authManager.logout();
                        }).catch(() => {
                            this.authManager.logout();
                        });
                    }
                });
                
                // Voice controls
                if (this.micBtn) {
                    this.micBtn.addEventListener('click', () => this.startListening());
                }
                
                // Stop listening when form is submitted
                this.chatForm.addEventListener('submit', () => {
                    if (this.isListening) {
                        this.stopListening();
                    }
                });
                
                this.messageInput.focus();
            }
            
            async loadActiveSession() {
                if (!this.authManager.userId) {
                    console.log('No userId, skipping session load');
                    return;
                }
                
                console.log('Loading active session for user_id:', this.authManager.userId);
                try {
                    const response = await fetch(`${this.activeSessionUrl}/${this.authManager.userId}`);
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Active session response:', data);
                        if (data.session_id && data.messages && data.messages.length > 0) {
                            console.log(`Loading session ${data.session_id} with ${data.messages.length} messages`);
                            this.currentSessionId = data.session_id;
                            this.messages = data.messages;
                            // Display loaded messages (without adding to array again)
                            this.chatMessages.innerHTML = '';
                            this.chatMessages.querySelector('.empty-state')?.remove();
                            data.messages.forEach(msg => {
                                // Display message without adding to array (already in this.messages)
                                this.displayMessage(msg.role, msg.content);
                            });
                            console.log('Loaded active session:', this.currentSessionId);
                        } else {
                            console.log('No active session found for user');
                        }
                    } else {
                        console.error('Failed to load active session:', response.status);
                    }
                } catch (error) {
                    console.error('Error loading active session:', error);
                }
            }
            
            displayMessage(role, content) {
                // Display message in UI without adding to messages array
                const emptyState = this.chatMessages.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.remove();
                }

                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${role}`;
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                
                const roleSpan = document.createElement('span');
                roleSpan.className = 'message-role';
                roleSpan.textContent = role === 'user' ? 'You' : 'AI';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'message-text';
                textDiv.innerHTML = this.parseMessage(content);
                
                messageContent.appendChild(roleSpan);
                messageContent.appendChild(textDiv);
                messageDiv.appendChild(messageContent);
                
                this.chatMessages.appendChild(messageDiv);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }

            async saveSession(generateSummary = false) {
                if (this.messages.length === 0 || !this.authManager.userId) return;
                
                try {
                    // If we have a current session and not generating summary, update it
                    if (this.currentSessionId && !generateSummary) {
                        const response = await fetch(`${this.updateSessionUrl}/${this.currentSessionId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                messages: this.messages
                            })
                        });
                        if (response.ok) {
                            console.log('Session updated successfully');
                            return;
                        }
                    }
                    
                    // Otherwise, save new session
                    const response = await fetch(this.saveSessionUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messages: this.messages,
                            user_id: parseInt(this.authManager.userId),
                            generate_summary: generateSummary
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.currentSessionId = data.session_id;
                        console.log(generateSummary ? 'Session saved with summary' : 'Session saved as draft');
                    }
                } catch (error) {
                    console.error('Error saving session:', error);
                }
            }
            
            async saveSessionDraft() {
                // Save without summary (for refresh)
                await this.saveSession(false);
            }

            async handleSubmit(e, messageOverride = null) {
                if (e && e.preventDefault) e.preventDefault();
                
                const message = (messageOverride !== null ? messageOverride : this.messageInput.value).trim();
                if (!message || this.isProcessing) return;

                // Add user message
                this.addMessage('user', message);
                this.messageInput.value = '';
                
                // Show typing indicator
                this.showTypingIndicator();
                this.setProcessing(true);

                try {
                    const response = await this.sendToBackend(message);
                    this.removeTypingIndicator();
                    this.addMessage('assistant', response);
                } catch (error) {
                    this.removeTypingIndicator();
                    this.showError(error.message);
                } finally {
                    this.setProcessing(false);
                }
            }

            async sendToBackend(userMessage) {
                // Check if user is authenticated
                if (!this.authManager.userId) {
                    throw new Error('You must be logged in to chat');
                }

                const requestBody = {
                    messages: this.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    user_id: parseInt(this.authManager.userId)
                };

                try {
                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.detail || 
                            `Backend error: ${response.status} ${response.statusText}`
                        );
                    }

                    const data = await response.json();
                    
                    if (!data.response) {
                        throw new Error('Invalid response format from backend');
                    }

                    return data.response;

                } catch (error) {
                    if (error.message.includes('Failed to fetch')) {
                        throw new Error('Cannot connect to backend. Make sure the FastAPI server is running on http://localhost:8000');
                    }
                    throw error;
                }
            }

            parseMessage(content) {
                // Split by code blocks first
                const parts = [];
                let remaining = content;
                let startIndex = 0;
                
                while (true) {
                    const codeStart = remaining.indexOf('```', startIndex);
                    if (codeStart === -1) {
                        // No more code blocks, add remaining text
                        if (remaining.substring(startIndex)) {
                            parts.push({ type: 'text', content: remaining.substring(startIndex) });
                        }
                        break;
                    }
                    
                    // Add text before code block
                    if (codeStart > startIndex) {
                        parts.push({ type: 'text', content: remaining.substring(startIndex, codeStart) });
                    }
                    
                    // Find closing ```
                    const codeEnd = remaining.indexOf('```', codeStart + 3);
                    if (codeEnd === -1) {
                        // Unclosed code block, treat rest as code
                        parts.push({ type: 'code', content: remaining.substring(codeStart + 3) });
                        break;
                    }
                    
                    // Add code block
                    parts.push({ type: 'code', content: remaining.substring(codeStart + 3, codeEnd) });
                    startIndex = codeEnd + 3;
                }
                
                // Build HTML from parts
                let html = '';
                for (const part of parts) {
                    if (part.type === 'code') {
                        html += `<code-block>${this.escapeHtml(part.content.trim())}</code-block>`;
                    } else {
                        html += this.processBoldText(part.content);
                    }
                }
                
                return html;
            }

            processBoldText(text) {
                // Process bold text (**text**) in regular text
                let html = '';
                let i = 0;
                
                while (i < text.length) {
                    if (text.substring(i, i + 2) === '**') {
                        const endBold = text.indexOf('**', i + 2);
                        if (endBold !== -1) {
                            const boldText = text.substring(i + 2, endBold);
                            html += `<strong>${this.escapeHtml(boldText)}</strong>`;
                            i = endBold + 2;
                        } else {
                            html += this.escapeHtml(text[i]);
                            i++;
                        }
                    } else {
                        html += this.escapeHtml(text[i]);
                        i++;
                    }
                }
                
                return html;
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            addMessage(role, content) {
                // Add to messages array
                this.messages.push({ role, content });

                // Remove empty state if present
                const emptyState = this.chatMessages.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.remove();
                }

                // Create message element
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${role}`;
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                
                const roleSpan = document.createElement('span');
                roleSpan.className = 'message-role';
                roleSpan.textContent = role === 'user' ? 'You' : 'AI';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'message-text';
                textDiv.innerHTML = this.parseMessage(content);
                
                messageContent.appendChild(roleSpan);
                messageContent.appendChild(textDiv);
                messageDiv.appendChild(messageContent);
                
                this.chatMessages.appendChild(messageDiv);
                this.scrollToBottom();
            }

            showTypingIndicator() {
                const typingDiv = document.createElement('div');
                typingDiv.className = 'message assistant';
                typingDiv.id = 'typing-indicator';
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                
                const roleSpan = document.createElement('span');
                roleSpan.className = 'message-role';
                roleSpan.textContent = 'AI';
                
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                
                messageContent.appendChild(roleSpan);
                messageContent.appendChild(typingIndicator);
                typingDiv.appendChild(messageContent);
                
                this.chatMessages.appendChild(typingDiv);
                this.scrollToBottom();
            }

            removeTypingIndicator() {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) {
                    indicator.remove();
                }
            }

            showError(message) {
                const existingError = this.chatMessages.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }

                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
                
                this.chatMessages.appendChild(errorDiv);
                this.scrollToBottom();

                setTimeout(() => {
                    if (errorDiv.parentElement) {
                        errorDiv.remove();
                    }
                }, 10000);
            }

            clearChat() {
                if (confirm('Are you sure you want to clear the chat history?')) {
                    // Stop any ongoing listening
                    this.stopListening();
                    
                    this.messages = [];
                    this.chatMessages.innerHTML = `
                        <div class="empty-state">
                            <p>👋 Start a conversation by typing a message below</p>
                        </div>
                    `;
                }
            }

            setProcessing(isProcessing) {
                this.isProcessing = isProcessing;
                this.messageInput.disabled = isProcessing;
                this.sendBtn.disabled = isProcessing;
                this.sendBtnText.textContent = isProcessing ? 'Sending...' : 'Send';
            }

            scrollToBottom() {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }

        // Initialize the app when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const authManager = new AuthManager();
            const chatBot = new ChatBot(authManager);
            window.chatBot = chatBot; // Make accessible for logout
        });
