'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatTab from './dashboard/ChatTab';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="fixed inset-4 sm:inset-10 md:inset-20 lg:inset-32 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
                                <p className="text-white/60 text-sm mt-1">Ask questions about placement experiences</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                                <X className="h-6 w-6 text-white/70 hover:text-white" />
                            </button>
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <ChatTab />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
