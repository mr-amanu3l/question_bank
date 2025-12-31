import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, createQuestion, deleteQuestion, getUsers, updateUserRole, grantQuestionAccess, revokeQuestionAccess, getLogs } from '../services/api';
import { jwtDecode } from 'jwt-decode';
import { LogOut, Plus, Trash2, Shield, FileText, Users, Building } from 'lucide-react';

const Dashboard = () => {
    const [questions, setQuestions] = useState([]);
    const [user] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [newQuestion, setNewQuestion] = useState({
        title: '',
        content: '',
        classification: 'Public',
        department: '',
        allowedUsers: [] 
    });
    const [members, setMembers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [accessManager, setAccessManager] = useState({});
    const [grantEmail, setGrantEmail] = useState('');
    const [activeTab, setActiveTab] = useState('Questions');
    const navigate = useNavigate();

    const fetchQuestions = async () => {
        try {
            const res = await getQuestions();
            setQuestions(res.data);
        } catch (err) {
            console.error('Failed to fetch questions', err);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const decoded = jwtDecode(user.token);
            if (decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } catch {
            localStorage.removeItem('user');
            navigate('/login');
        }

        setTimeout(async () => {
            fetchQuestions();
            if (user?.role === 'Admin') {
                try {
                    const res = await getUsers();
                    setMembers(res.data);
                } catch (e) {
                    console.error('Failed to fetch users', e);
                }
                try {
                    const lr = await getLogs({ limit: 100 });
                    setLogs(lr.data);
                } catch (e) {
                    console.error('Failed to fetch logs', e);
                }
            }
        }, 0);
    }, [navigate, user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createQuestion({
                ...newQuestion,
                department: newQuestion.department || user.department
            });
            alert('Question created!');
            setNewQuestion({ title: '', content: '', classification: 'Public', department: '' });
            fetchQuestions();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create question');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await deleteQuestion(id);
                fetchQuestions();
            } catch (err) {
                alert(err.response?.data?.message || 'Failed to delete');
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const getClassificationColor = (cls) => {
        switch(cls) {
            case 'Public': return 'public';
            case 'Internal': return 'internal';
            case 'Confidential': return 'confidential';
            default: return '';
        }
    };

    if (!user) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>;

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
            <header className="nav-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Shield color="var(--primary)" />
                    <h2 style={{ fontSize: '1.25rem' }}>Secure Exam System</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600' }}>{user.username}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.role} | {user.department}</div>
                    </div>
                    <button onClick={handleLogout} className="danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1>Dashboard</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Access Level: {user.role}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button 
                        className={activeTab === 'Questions' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('Questions')}
                    >
                        <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        Questions
                    </button>
                    {(user.role === 'Lecturer' || user.role === 'Admin') && (
                        <button 
                            className={activeTab === 'Create' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('Create')}
                        >
                            <Plus size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            Create
                        </button>
                    )}
                    {user.role === 'Admin' && (
                        <button 
                            className={activeTab === 'Members' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('Members')}
                        >
                            <Users size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            Members
                        </button>
                    )}
                    {user.role === 'Admin' && (
                        <button 
                            className={activeTab === 'Audit' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('Audit')}
                        >
                            <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            Audit
                        </button>
                    )}
                </div>

                {activeTab === 'Create' && (
                    <div className="card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease' }}>
                        <h3>Create New Question</h3>
                        <form onSubmit={handleCreate} style={{ marginTop: '1rem' }}>
                            <div className="grid grid-2">
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Title</label>
                                    <input 
                                        value={newQuestion.title} 
                                        onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})} 
                                        required 
                                        placeholder="e.g. Network Security Basics"
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Content</label>
                                    <textarea 
                                        value={newQuestion.content} 
                                        onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})} 
                                        required 
                                        placeholder="Question text..."
                                        rows="4"
                                    />
                                </div>
                                <div>
                                    <label>Classification (MAC)</label>
                                    <select 
                                        value={newQuestion.classification} 
                                        onChange={(e) => setNewQuestion({...newQuestion, classification: e.target.value})}
                                    >
                                        <option value="Public">Public</option>
                                        <option value="Internal">Internal</option>
                                        <option value="Confidential">Confidential</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Department (ABAC)</label>
                                    <input 
                                        value={newQuestion.department} 
                                        onChange={(e) => setNewQuestion({...newQuestion, department: e.target.value})} 
                                        placeholder={user.department}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="primary" style={{ marginTop: '1rem' }}>Submit Question</button>
                        </form>
                    </div>
                )}

                {activeTab === 'Questions' && (() => {
                    const groups = { Public: [], Internal: [], Confidential: [] };
                    questions.forEach(q => {
                        if (groups[q.classification]) groups[q.classification].push(q);
                    });
                    const renderGroup = (label) => (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>{label}</h3>
                            <div className="grid grid-2">
                                {groups[label].length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        <FileText size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                        <p>No {label.toLowerCase()} questions.</p>
                                    </div>
                                ) : (
                                    groups[label].map(q => (
                                        <div key={q._id} className="card" style={{ position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <span className={`badge ${getClassificationColor(q.classification)}`}>
                                                    {q.classification}
                                                </span>
                                                {(user.role === 'Admin' || (q.owner?.username === user.username)) && (
                                                    <button 
                                                        onClick={() => handleDelete(q._id)} 
                                                        style={{ background: 'none', color: 'var(--text-muted)', padding: '0.25rem' }}
                                                        title="Delete Question"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <h3 style={{ marginBottom: '0.5rem' }}>{q.title}</h3>
                                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                                {q.accessDenied ? 'You can’t access this question in your field.' : q.content}
                                            </p>
                                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Users size={14} /> {q.owner?.username || 'Unknown'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Building size={14} /> {q.department}
                                                </div>
                                            </div>
                                            {(user.role === 'Admin' || (q.owner?.username === user.username)) && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <button 
                                                        className="secondary"
                                                        onClick={() => setAccessManager(prev => ({ ...prev, [q._id]: !prev[q._id] }))}
                                                    >
                                                        {accessManager[q._id] ? 'Close Access' : 'Manage Access'}
                                                    </button>
                                                    {accessManager[q._id] && (
                                                        <div style={{ marginTop: '0.75rem' }}>
                                                            <div style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                                                Allowed Users
                                                            </div>
                                                            <div className="grid grid-2">
                                                                {(q.allowedUsers || []).map(u => (
                                                                    <div key={u._id} className="card" style={{ padding: '0.75rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div>
                                                                                <div style={{ fontWeight: 600 }}>{u.username}</div>
                                                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</div>
                                                                            </div>
                                                                            <button 
                                                                                className="danger"
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        await revokeQuestionAccess(q._id, { userId: u._id });
                                                                                        const res = await getQuestions();
                                                                                        setQuestions(res.data);
                                                                                    } catch (err) {
                                                                                        alert(err.response?.data?.message || 'Failed to revoke access');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Revoke
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                                                <input 
                                                                    placeholder="Grant by email"
                                                                    value={grantEmail}
                                                                    onChange={(e) => setGrantEmail(e.target.value)}
                                                                />
                                                                <button 
                                                                    className="primary"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await grantQuestionAccess(q._id, { email: grantEmail });
                                                                            setGrantEmail('');
                                                                            const res = await getQuestions();
                                                                            setQuestions(res.data);
                                                                        } catch (err) {
                                                                            alert(err.response?.data?.message || 'Failed to grant access');
                                                                        }
                                                                    }}
                                                                >
                                                                    Grant
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                    return (
                        <div>
                            {renderGroup('Public')}
                            {renderGroup('Internal')}
                            {user.role !== 'Student' && renderGroup('Confidential')}
                        </div>
                    );
                })()}

                {activeTab === 'Members' && user.role === 'Admin' && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <div className="grid grid-2">
                            {members.map(m => (
                                <div key={m._id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{m.username}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{m.email}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{m.department}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <select 
                                                value={m.role}
                                                onChange={(e) => {
                                                    const newRole = e.target.value;
                                                    setMembers(prev => prev.map(x => x._id === m._id ? { ...x, role: newRole } : x));
                                                }}
                                            >
                                                <option value="Student">Student</option>
                                                <option value="Lecturer">Lecturer</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                            <button 
                                                className="primary"
                                                onClick={async () => {
                                                    try {
                                                        await updateUserRole(m._id, m.role);
                                                        alert('Role updated');
                                                        const res = await getUsers();
                                                        setMembers(res.data);
                                                    } catch (err) {
                                                        alert(err.response?.data?.message || 'Failed to update role');
                                                    }
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'Audit' && user.role === 'Admin' && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <div className="card">
                            <h3>Audit Logs</h3>
                            <div style={{ marginTop: '1rem' }}>
                                {logs.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)' }}>No logs found.</div>
                                ) : (
                                    <div>
                                        {logs.map(l => (
                                            <div key={l._id} style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div style={{ fontWeight: 600 }}>{l.action}</div>
                                                    <div style={{ color: 'var(--text-muted)' }}>{new Date(l.timestamp).toLocaleString()}</div>
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    {l.userId ? `${l.userId.username} (${l.userId.role})` : 'SYSTEM'}
                                                    {l.details ? ` — ${l.details}` : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
