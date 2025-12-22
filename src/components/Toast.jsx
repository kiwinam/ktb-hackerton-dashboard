import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 3000);

		return () => clearTimeout(timer);
	}, [onClose]);

	const isError = type === 'error';

	return (
		<motion.div
			initial={{ opacity: 0, y: 50 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 50 }}
			className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg flex items-center space-x-3 backdrop-blur-sm z-50 ${isError ? 'bg-red-500/95 text-white' : 'bg-gray-900/90 text-white'}`}
		>
			{isError ? (
				<X className="w-5 h-5 text-white" />
			) : (
				<CheckCircle2 className="w-5 h-5 text-kakao-yellow" />
			)}
			<span className="font-medium">{message}</span>
		</motion.div>
	);
};

export default Toast;
