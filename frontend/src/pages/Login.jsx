import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, verifyMfa } from '../services/api';
import { Shield, Lock, Key, ChevronRight } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await login(email, password);
            if (res.data.mfaRequired) {
                setUserId(res.data.userId);
                setStep(2);
                setError('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    const handleMfa = async (e) => {
        e.preventDefault();
        try {
            const res = await verifyMfa(userId, otp);
            localStorage.setItem('user', JSON.stringify(res.data));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'MFA failed');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        background: 'rgba(37, 99, 235, 0.1)', 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <Shield size={32} color="var(--primary)" />
                    </div>
                    <h2>Secure Exam System</h2>
                    <p style={{ color: 'var(--text-muted)' }}>University Question Bank</p>
                </div>

                {error && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: 'var(--danger)', 
                        padding: '0.75rem', 
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleLogin}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button type="submit" className="primary" style={{ width: '100%' }}>
                            Continue <ChevronRight size={16} style={{ verticalAlign: 'middle' }} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleMfa}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <Lock size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                            <h3>MFA Verification</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Please enter the OTP code displayed in your server console.
                            </p>
                        </div>
                        <div>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                required 
                                placeholder="Enter 6-digit code"
                                style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }}
                            />
                        </div>
                        <button type="submit" className="primary" style={{ width: '100%' }}>
                            Verify Login
                        </button>
                    </form>
                )}
                
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Register</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
