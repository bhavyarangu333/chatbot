import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import routes from './routes.js';
import bodyParser from 'body-parser';

dotenv.config();
const __dirname = path.resolve();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'test' 
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
});

const userSchema = new mongoose.Schema({
    googleId: String,
    email: { type: String, unique: true, sparse: true },
    password: String,
}, { collection: 'users' }); 

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5173/auth/google/callback"
}, async(accessToken, refreshToken, profile, cb) => {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
        user = await User.create({ googleId: profile.id, email: profile.emails[0].value });
    }
    return cb(null, user);
}));

passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(async function(id, cb) {
    try {
        const user = await User.findById(id);
        cb(null, user);
    } catch (error) {
        cb(error);
    }
});
app.use(bodyParser.json()); 
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.path}`);
    next();
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

app.get('/auth/status', (req, res) => {
    res.status(200).send({ isAuthenticated: req.isAuthenticated() });
});
app.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.' });
        }

        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists please login' });
        }

        const user = new User({ email, password });
        await user.save();
        console.log('Signup successful');
        return res.status(201).json({ message: 'Signup successful' });
        
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Error during signup' });
    }
});

app.post('/login', async(req, res) => {
    try {
        console.log("Login request received:", req.body);
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found");
            return res.status(401).json({ message: 'User not found' });
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            console.log("Invalid password");
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        req.login(user, err => {
            if (err) {
                console.error("Error logging in:", err);
                return res.status(500).json({ message: err.message });
            }
            console.log("Login successful");
            return res.status(200).json({ message: 'Login successful' });
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Error during login' });
    }
});
app.get('/', ensureAuthenticated, (req, res) => {
    res.status(200).send('Welcome to the AI server! Click <a href="http://localhost:3000/">here</a> to continue.');
});

app.use('/api', routes);

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
