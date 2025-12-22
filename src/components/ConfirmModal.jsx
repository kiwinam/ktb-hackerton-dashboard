import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, description, confirmText = "확인", cancelText = "취소", isDangerous = false }) => {
	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
					>
						<div className="bg-white rounded-2xl w-full max-w-sm shadow-xl pointer-events-auto overflow-hidden">
							<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
								<h3 className={`font-bold flex items-center gap-2 ${isDangerous ? 'text-red-600' : 'text-gray-900'}`}>
									<AlertCircle className="w-5 h-5" />
									{title}
								</h3>
								<button
									onClick={onClose}
									className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							<div className="p-6">
								<p className="text-gray-600 mb-8 whitespace-pre-wrap">
									{description}
								</p>

								<div className="flex gap-3">
									<button
										onClick={onClose}
										className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors"
									>
										{cancelText}
									</button>
									<button
										onClick={() => {
											onConfirm();
											onClose();
										}}
										className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors ${isDangerous
												? 'bg-red-500 hover:bg-red-600'
												: 'bg-kakao-black hover:bg-gray-800'
											}`}
									>
										{confirmText}
									</button>
								</div>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};

export default ConfirmModal;
