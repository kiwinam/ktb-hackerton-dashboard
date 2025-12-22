import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';

const PasswordModal = ({ isOpen, onClose, onVerify, title = "비밀번호 확인", description = "비밀번호를 입력해주세요." }) => {
	const [password, setPassword] = useState('');
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		const result = await onVerify(password);
		if (result === true || result?.success) {
			setPassword('');
			setError(null);
			onClose();
		} else {
			// result is either false or an object with error message
			const msg = result?.error || "비밀번호가 일치하지 않습니다.";
			setError(msg);
			// Shake animation trigger could go here
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
					>
						<div className="bg-white rounded-2xl w-full max-w-sm shadow-xl pointer-events-auto overflow-hidden">
							<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
								<h3 className="font-bold text-gray-900 flex items-center gap-2">
									<Lock className="w-4 h-4" />
									{title}
								</h3>
								<button
									onClick={onClose}
									className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							<form onSubmit={handleSubmit} className="p-6">
								<p className="text-sm text-gray-600 mb-4">
									{description}
								</p>

								<input
									type="password"
									autoFocus
									maxLength={6}
									inputMode="numeric"
									pattern="[0-9]*"
									value={password}
									onChange={(e) => {
										const val = e.target.value.replace(/[^0-9]/g, '');
										setPassword(val);
										setError(null);
									}}
									className={`w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border rounded-lg focus:ring-2 outline-none transition-all font-mono ${error
										? 'border-red-300 focus:ring-red-200 bg-red-50'
										: 'border-gray-300 focus:ring-kakao-yellow focus:border-transparent'
										}`}
									placeholder="******"
									autoComplete="new-password"
								/>

								{error && (
									<p className="text-red-500 text-xs mt-2 text-center font-medium whitespace-pre-wrap">
										{error}
									</p>
								)}

								<button
									type="submit"
									className="w-full mt-6 bg-kakao-black text-white py-3 rounded-lg font-bold hover:bg-black transition-colors"
								>
									확인
								</button>
							</form>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};

export default PasswordModal;
