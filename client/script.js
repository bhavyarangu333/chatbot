import bot from './assets/bot.svg';
import user from './assets/user.svg';

const form = document.querySelector('form');
const chatContainer = document.querySelector('#chat_container');
const signInButton = document.createElement('button');
const signupForm = document.getElementById('signupForm');

let isSubmitting = false;

function loader(element) {
    element.textContent = '';

    const loadInterval = setInterval(() => {
        element.textContent += '.';
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);

    return loadInterval;
}

function typeText(element, text) {
    let index = 0;

    const interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 20);
}

function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
    return `
        <div class="wrapper ${isAi ? 'ai' : ''}">
            <div class="chat">
                <div class="profile">
                    <img src=${isAi ? bot : user} alt="${isAi ? 'bot' : 'user'}" />
                </div>
                <div class="message" id=${uniqueId}>${value}</div>
            </div>
        </div>
    `;
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && (contentType.includes('application/json') || contentType.includes('text/html'))) {
                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    signInButton.style.display = data.isAuthenticated ? 'none' : 'block';
                } else {
                    console.warn('Unexpected content type:', contentType);
                    signInButton.style.display = 'block';
                }
            } else {
                throw new Error('Invalid content type received');
            }
        } else {
            throw new Error('Failed to fetch authentication status');
        }
    } catch (error) {
        console.error(error);
        signInButton.style.display = 'block';
    }
}
signInButton.addEventListener('click', () => {
    window.location.href = '/auth/google';
});
document.body.appendChild(signInButton);

async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;

    isSubmitting = true;

    const data = new FormData(form);
    const prompt = data.get('prompt');

    chatContainer.innerHTML += chatStripe(false, prompt);

    form.reset();

    const uniqueId = generateUniqueId();
    chatContainer.innerHTML += chatStripe(true, '', uniqueId);

    chatContainer.scrollTop = chatContainer.scrollHeight;

    const messageDiv = document.getElementById(uniqueId);
    const loadInterval = loader(messageDiv);

    try {
        const response = await fetch('http://localhost:5173/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });

        clearInterval(loadInterval);
        messageDiv.innerHTML = '';

        if (response.ok) {
            const jsonResponse = await response.json();
            const parsedData = jsonResponse.response.trim();
            typeText(messageDiv, parsedData);
        } else {
            throw new Error('Something went wrong with OpenAI request');
        }
    } catch (error) {
        messageDiv.innerHTML = 'Something went wrong';
    }

    isSubmitting = false;
}

async function handleSignup(e) {
    e.preventDefault();

    if (isSubmitting) return;

    isSubmitting = true;

    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const signupErrorMessage = document.getElementById('signupErrorMessage');
    const signupSuccessMessage = document.getElementById('signupSuccessMessage');

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const responseData = await response.json();

        if (response.ok) {
            signupSuccessMessage.textContent = responseData.message;
            signupSuccessMessage.style.display = 'block';
        } else {
            signupErrorMessage.textContent = 'Signup failed: ' + responseData.message;
        }
        
    } catch (error) {
        console.error(error);
        signupErrorMessage.textContent = 'Error during signup. Please try again.';
    }

    isSubmitting = false;
}

async function handleLogin(e) {
    e.preventDefault();

    if (isSubmitting) return;

    isSubmitting = true;

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginErrorMessage = document.getElementById('loginErrorMessage');

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const responseData = await response.json();

        if (response.ok) {
            alert('Login successful!');
            window.location.href = '/';
        } else {
            console.error('Login failed:', responseData.message); 
            loginErrorMessage.textContent = 'Login failed: ' + responseData.message; 
        }
    } catch (error) {
        console.error(error);
        loginErrorMessage.textContent = 'Error during login. Please try again.';
    }

    isSubmitting = false;
}

if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
}
form.addEventListener('submit', handleSubmit)
form.addEventListener('submit', handleLogin);

form.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        handleSubmit(e);
    }
});
