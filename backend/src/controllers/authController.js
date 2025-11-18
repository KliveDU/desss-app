const db = require('../config/desss_db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign({ user }, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        const userPayload = {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
        };

        res.json({
            user: userPayload,
            token: generateToken(userPayload),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { loginUser };