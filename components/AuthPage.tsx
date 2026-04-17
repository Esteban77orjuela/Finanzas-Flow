import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, Lock, Mail, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthPageProps {
  onFinishRecovery?: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'reset';
}

const AuthPage: React.FC<AuthPageProps> = ({ onFinishRecovery, initialMode }) => {
  const [isLogin, setIsLogin] = useState(initialMode ? initialMode === 'login' : true);
  const [isForgotPassword, setIsForgotPassword] = useState(initialMode === 'forgot');
  const [isResetPassword, setIsResetPassword] = useState(initialMode === 'reset');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Escuchar el evento de recuperación de contraseña de Supabase
  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsLogin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email) {
          setError('Por favor ingresa tu correo electrónico.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });

        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('Se ha enviado un correo para restablecer tu contraseña.');
          setIsForgotPassword(false);
          setIsLogin(true);
        }
        setLoading(false);
        return;
      }

      if (isResetPassword) {
        if (!password || password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('Contraseña actualizada exitosamente. Ya puedes iniciar sesión.');
          setIsResetPassword(false);
          setIsLogin(true);
          if (onFinishRecovery) onFinishRecovery();
          // Opcional: Cerrar sesión para forzar re-login con nueva pass
          await supabase.auth.signOut();
        }
        setLoading(false);
        return;
      }

      // Validations for Login/Register
      if (!email || !password) {
        setError('Por favor completa todos los campos.');
        setLoading(false);
        return;
      }

      if (!isLogin && password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email o contraseña incorrectos.');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Revisa tu correo y confirma tu cuenta antes de iniciar sesión.');
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('already registered')) {
            setError('Este correo ya está registrado. Intenta iniciar sesión.');
          } else {
            setError(error.message);
          }
        } else {
          setSuccessMessage(
            '¡Cuenta creada exitosamente! Revisa tu correo electrónico para confirmar tu cuenta.'
          );
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FinanzaFlow</h1>
          <p className="text-slate-400 mt-2">Tu control financiero personal</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Tab Toggle (Only if not in Reset/Forgot mode) */}
          {!isForgotPassword && !isResetPassword && (
            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isLogin
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  !isLogin
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Registrarse
              </button>
            </div>
          )}

          {/* Titles for Forgot/Reset */}
          {isForgotPassword && (
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-white">Recuperar Contraseña</h2>
              <p className="text-slate-400 text-sm mt-1">
                Te enviaremos un correo para restablecerla.
              </p>
            </div>
          )}
          {isResetPassword && (
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-white">Nueva Contraseña</h2>
              <p className="text-slate-400 text-sm mt-1">Crea una nueva contraseña segura.</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 animate-fade-in">
              <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-rose-300 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 animate-fade-in">
              <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-emerald-300 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (Not for Reset Password) */}
            {!isResetPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password (Only for Login, Register, or Reset) */}
            {!isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {isResetPassword ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    autoComplete={
                      isResetPassword
                        ? 'new-password'
                        : isLogin
                          ? 'current-password'
                          : 'new-password'
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Register or Reset only) */}
            {!isLogin && !isForgotPassword && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Link (Only for Login) */}
            {isLogin && !isForgotPassword && !isResetPassword && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-all duration-200 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isForgotPassword ? (
                'Enviar correo de recuperación'
              ) : isResetPassword ? (
                'Actualizar contraseña'
              ) : isLogin ? (
                <>
                  <LogIn size={18} />
                  Iniciar Sesión
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Crear Cuenta
                </>
              )}
            </button>

            {/* Back to Login (Only for Forgot/Reset) */}
            {(isForgotPassword || isResetPassword) && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsResetPassword(false);
                  setIsLogin(true);
                  if (onFinishRecovery) onFinishRecovery();
                  resetForm();
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors mt-2"
              >
                Volver al inicio de sesión
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Tus datos están protegidos con cifrado de extremo a extremo.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
