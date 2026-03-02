/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Play, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type Screen = 'KEY_SYSTEM' | 'MAIN' | 'INSTALLATION' | 'SUCCESS' | 'ALREADY_INSTALLED' | 'FAILURE';

export default function App() {
  const [screen, setScreen] = useState<Screen>('KEY_SYSTEM');
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [showUpdates, setShowUpdates] = useState(false);
  
  // Random duration between 5 and 10 minutes (in milliseconds)
  const durationRef = useRef(Math.floor(Math.random() * (10 * 60 * 1000 - 5 * 60 * 1000 + 1)) + 5 * 60 * 1000);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto-login check
    fetch('/api/check-session')
      .then(res => res.json())
      .then(data => {
        if (data.active) {
          setIsInstalled(data.installed);
          setScreen('MAIN');
        }
      })
      .catch(() => {
        // Fallback to local storage if API fails
        const savedKey = localStorage.getItem('zenin_key');
        const installed = localStorage.getItem('zenin_installed');
        if (savedKey === 'New2026') {
          setIsInstalled(installed === 'true');
          setScreen('MAIN');
        }
      });
  }, []);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('zenin_key', keyInput);
        setIsInstalled(data.isInstalled);
        if (data.isInstalled) {
          setScreen('ALREADY_INSTALLED');
        } else {
          setScreen('MAIN');
        }
      } else {
        setError(data.message || 'Ключ неверный!');
      }
    } catch (err) {
      // Offline fallback
      if (keyInput === 'New2026') {
        localStorage.setItem('zenin_key', 'New2026');
        setScreen('MAIN');
      } else {
        setError('Ключ неверный!');
      }
    }
  };

  useEffect(() => {
    if (screen === 'INSTALLATION') {
      startTimeRef.current = Date.now();
      
      const updateProgress = async () => {
        if (!startTimeRef.current) return;
        
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        const currentProgress = (elapsed / durationRef.current) * 100;
        
        if (currentProgress >= 100) {
          setProgress(100);
          
          // Notify server about installation
          await fetch('/api/install', { method: 'POST' }).catch(() => {});
          
          localStorage.setItem('zenin_installed', 'true');
          setIsInstalled(true);
          setTimeout(() => setScreen('SUCCESS'), 1000);
          return;
        }
        
        setProgress(currentProgress);
        requestAnimationFrame(updateProgress);
      };
      
      const animationId = requestAnimationFrame(updateProgress);
      return () => cancelAnimationFrame(animationId);
    }
  }, [screen]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {screen === 'KEY_SYSTEM' && (
          <motion.div
            key="key-system"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md flex flex-col items-center"
          >
            <h1 className="text-2xl font-bold mb-8 tracking-widest uppercase">Key System</h1>
            <form onSubmit={handleKeySubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Введите ключ"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 transition-colors text-center"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-red-600 hover:text-white transition-all active:scale-95"
              >
                CHECK KEY
              </button>
            </form>
            <div className="h-12 mt-4 flex flex-col items-center justify-center">
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 font-bold">
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}

        {screen === 'MAIN' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-md flex flex-col items-center"
          >
            <h1 className="text-4xl font-black mb-12 italic">
              Zenin<span className="text-red-600">.cc</span>
            </h1>

            <button
              onClick={() => setShowUpdates(!showUpdates)}
              className="fixed top-8 right-8 p-4 bg-white/5 border border-white/10 rounded-full hover:bg-red-600/20 hover:border-red-600/50 transition-all z-[60] group shadow-lg backdrop-blur-md"
            >
              <Info className="w-7 h-7 text-white/40 group-hover:text-red-500 transition-colors" />
            </button>

            <AnimatePresence>
              {showUpdates && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowUpdates(false)}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 20, y: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20, y: -20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed top-24 right-8 w-80 bg-[#121212]/90 border border-white/10 p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] backdrop-blur-xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Changelog</h3>
                      </div>
                      <button 
                        onClick={() => setShowUpdates(false)}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 opacity-30 hover:opacity-100" />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="relative pl-6 border-l border-red-600/30">
                        <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] bg-red-600 rounded-full shadow-[0_0_10px_#dc2626]" />
                        <p className="text-xs font-black text-white mb-3 tracking-tight">Version 1.0.0 <span className="text-red-600/50 font-medium ml-2">Initial Release</span></p>
                        <ul className="space-y-2">
                          {[
                            'Новый футуристичный интерфейс',
                            'Инжектор последнего поколения',
                            'Оптимизированная загрузка модулей',
                            'Система анти-спама (Rate Limit)',
                            'Визуальные модули (Chams)'
                          ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-[11px] text-white/40">
                              <span className="text-red-600 font-bold">+</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                      <p className="text-[9px] uppercase tracking-[0.5em] font-black opacity-20">Zenin.cc System</p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-4 w-full items-center">
              <button
                onClick={async () => {
                  if (isInstalled) {
                    try {
                      const res = await fetch('/api/inject', { method: 'POST' });
                      const data = await res.json();
                      if (data.success) {
                        setScreen('ALREADY_INSTALLED');
                      } else if (data.error === 'RATE_LIMIT') {
                        setFailureMessage(data.message);
                        setIsInstalled(false);
                        localStorage.removeItem('zenin_installed');
                        setScreen('FAILURE');
                      }
                    } catch (err) {
                      setScreen('ALREADY_INSTALLED');
                    }
                  } else {
                    setScreen('INSTALLATION');
                  }
                }}
                className="group relative flex items-center justify-center gap-3 bg-white text-black font-black text-xl px-12 py-4 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <Play className="w-6 h-6 fill-current" />
                START GAME
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'FAILURE' && (
          <motion.div
            key="failure"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="flex justify-center">
              <AlertTriangle className="w-20 h-20 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight uppercase text-red-500">Сбой</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                {failureMessage}
              </p>
            </div>
            <button
              onClick={() => {
                setProgress(0);
                setScreen('MAIN');
              }}
              className="text-xs uppercase tracking-widest border border-white/10 px-8 py-3 rounded hover:bg-white hover:text-black transition-all"
            >
              Back to menu
            </button>
          </motion.div>
        )}

        {screen === 'INSTALLATION' && (
          <motion.div
            key="installation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg space-y-8"
          >
            <div className="bg-[#151515] border border-red-500/20 p-6 rounded-xl space-y-4">
              <div className="flex items-start gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
                <p className="text-sm leading-relaxed">
                  Наш бесплатный релиз апк сейчас работает с memory вашей игры, просьба не открывать Standoff 2 Пока мы вас не уведомим об завершении, так как это может вызвать сбои
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-tighter opacity-50">
                <span>Installing modules...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-red-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs opacity-30 tracking-widest uppercase">
                Zenin DLC No root 0.37.1
              </p>
            </div>
          </motion.div>
        )}

        {screen === 'SUCCESS' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="flex justify-center">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Успешно установлено!</h2>
              <p className="text-white/60">Приятной игры, приглашайте друзей!</p>
            </div>
            <button
              onClick={() => setScreen('MAIN')}
              className="text-xs uppercase tracking-widest border border-white/10 px-8 py-3 rounded hover:bg-white hover:text-black transition-all"
            >
              Back to menu
            </button>
          </motion.div>
        )}

        {screen === 'ALREADY_INSTALLED' && (
          <motion.div
            key="already-installed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="flex justify-center">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight uppercase">Injected!</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Инжектировано, заходите в игру! Также примечание: меню тут нету, если у вас нет чамсов в игре, значит ваше устройство не подходит, следите за обновлениями! Zenin.cc
              </p>
            </div>
            <div className="pt-8">
              <p className="text-[10px] opacity-20 tracking-[0.3em] uppercase italic">Zenin DLC Active</p>
            </div>
            <button
              onClick={() => setScreen('MAIN')}
              className="text-xs uppercase tracking-widest border border-white/10 px-8 py-3 rounded hover:bg-white hover:text-black transition-all"
            >
              Back to menu
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,#000_100%)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      </div>
    </div>
  );
}
