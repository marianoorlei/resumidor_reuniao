import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isRegister) {
                const { error: signUpError } = await signUp(email, password);
                if (signUpError) throw signUpError;
                setSuccess('Conta criada com sucesso! Verifique seu email para confirmar ou faça login.');
                setIsRegister(false);
            } else {
                const { error: signInError } = await signIn(email, password);
                if (signInError) throw signInError;
                navigate('/dashboard');
            }
        } catch (err) {
            if (isRegister) {
                if (err.message?.includes('already registered')) {
                    setError('Este email já está cadastrado. Faça login.');
                } else if (err.message?.includes('password')) {
                    setError('A senha deve ter pelo menos 6 caracteres.');
                } else {
                    setError('Falha ao criar conta. Tente novamente.');
                }
            } else {
                setError('Falha ao autenticar. Verifique suas credenciais.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            setError('Erro no login social.');
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setSuccess('');
    };

    return (
        <div className="min-h-screen flex bg-[#0f1117]">
            {/* Left Area - Illustration */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-center items-center text-white p-12 relative overflow-hidden">
                <div className="z-10 text-center max-w-md">
                    <div className="flex justify-center mb-8">
                        <BrainCircuit size={64} className="text-white opacity-90" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">A IA trabalhando por você</h2>
                    <p className="text-lg text-blue-100 opacity-90 italic">
                        "A análise automatizada de reuniões transformou a forma como nosso time colabora. Economizamos horas toda semana."
                    </p>
                    <p className="mt-4 text-sm font-medium text-blue-200">
                        — Sarah Jenkins, Líder de Produto na TechCorp
                    </p>
                </div>

                {/* Abstract shapes for background */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl"></div>
                </div>
            </div>

            {/* Right Area - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-100">
                            {isRegister ? 'Criar conta' : 'Bem-vindo de volta'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-400">
                            {isRegister ? 'Cadastre-se no D3tech IA Meet' : 'Faça login no D3tech IA Meet'}
                        </p>
                    </div>

                    <div className="mt-8">
                        <div className="mt-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</div>}
                                {success && <div className="text-green-400 text-sm text-center font-medium bg-green-500/10 border border-green-500/20 p-2 rounded">{success}</div>}

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">Email</label>
                                    <div className="mt-1">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="nome@empresa.com"
                                            className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-[#1a1d27] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">Senha</label>
                                    <div className="mt-1">
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Digite sua senha'}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-[#1a1d27] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                {!isRegister && (
                                    <div className="flex items-center justify-start">
                                        <div className="text-sm">
                                            <a href="#" className="font-medium text-blue-400 hover:text-blue-300">
                                                Esqueceu a senha?
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[#0f1117] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Aguarde...' : (isRegister ? 'Criar conta' : 'Entrar')}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-700" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-[#0f1117] text-gray-500">ou</span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={handleGoogleSignIn}
                                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-[#1a1d27] text-sm font-medium text-gray-300 hover:bg-[#252836] transition-colors"
                                    >
                                        {/* Google SVG */}
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                        Continuar com Google
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 text-center text-sm text-gray-400">
                                {isRegister ? (
                                    <>Já tem uma conta? <button onClick={toggleMode} className="font-medium text-blue-400 hover:underline">Faça login</button></>
                                ) : (
                                    <>Não tem uma conta? <button onClick={toggleMode} className="font-medium text-blue-400 hover:underline">Cadastre-se</button></>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
