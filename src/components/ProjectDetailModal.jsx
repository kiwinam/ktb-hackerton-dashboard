import React, { useState, useEffect } from 'react';
import { X, Send, Trash2, Calendar, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addComment, subscribeToComments, deleteComment } from '../lib/firebase';
import PasswordModal from './PasswordModal';

const BAD_WORDS = ['바보', '멍청이', '씨발', '개새끼', '병신', '지랄', 'fuck', 'shit']; // Simple Profanity Filter - Add more if needed

const ProjectDetailModal = ({ project, isOpen, onClose }) => {
	const [comments, setComments] = useState([]);
	const [newComment, setNewComment] = useState('');
	const [authorName, setAuthorName] = useState('');
	const [password, setPassword] = useState('');
	const [deleteTargetId, setDeleteTargetId] = useState(null);
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (isOpen && project) {
			document.body.style.overflow = 'hidden';
			const unsubscribe = subscribeToComments(project.id, (data) => {
				setComments(data);
			});
			return () => {
				document.body.style.overflow = 'unset';
				unsubscribe();
			};
		}
	}, [isOpen, project]);

	const handleCommentSubmit = async (e) => {
		e.preventDefault();
		if (!newComment.trim() || !authorName.trim() || !password.trim()) return;

		// Profanity Check
		const hasBadWord = BAD_WORDS.some(word => newComment.includes(word));
		if (hasBadWord) {
			alert("비속어가 포함된 댓글은 등록할 수 없습니다. 바르고 고운 말을 써주세요! 😊");
			return;
		}

		setIsSubmitting(true);
		const result = await addComment(project.id, {
			content: newComment,
			author: authorName,
			password: password
		});
		setIsSubmitting(false);

		if (result.success) {
			setNewComment('');
			// Optional: Keep author name/password for convenience or clear them? 
			// Let's keep author name, clear password for security habit, though for hackathon convenience maybe keep?
			// Clearing password is safer.
			setPassword('');
		} else {
			alert("댓글 등록에 실패했습니다.");
		}
	};

	const handleDeleteClick = (commentId) => {
		setDeleteTargetId(commentId);
		setIsPasswordModalOpen(true);
	};

	const handlePasswordVerify = async (inputPassword) => {
		const result = await deleteComment(project.id, deleteTargetId, inputPassword);
		if (result.success) {
			setIsPasswordModalOpen(false);
			setDeleteTargetId(null);
			return true;
		} else {
			return false;
		}
	};

	if (!isOpen || !project) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
					>
						<div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden">
							{/* Header */}
							<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
								<h2 className="text-xl font-bold text-gray-900 truncate pr-4">
									{project.title}
								</h2>
								<button
									onClick={onClose}
									className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
								>
									<X className="w-6 h-6" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto">
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8">
									{/* Left: Project Details */}
									<div className="p-6 lg:border-r border-gray-100 bg-gray-50">
										<div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6 bg-white">
											{project.imageUrl ? (
												<img src={project.imageUrl} alt={project.title} className="w-full h-auto object-cover" />
											) : (
												<div className="aspect-video flex items-center justify-center bg-gray-100 text-gray-400">
													이미지 없음
												</div>
											)}
										</div>

										<div className="flex flex-wrap gap-2 mb-4">
											{project.team && (
												<span className="bg-kakao-black text-white px-3 py-1 rounded-full text-sm font-bold">
													{project.team}
												</span>
											)}
											{project.tags && project.tags.map((tag, i) => (
												<span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
													#{tag}
												</span>
											))}
										</div>

										<p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg mb-8">
											{project.description}
										</p>

										<div className="bg-white p-4 rounded-xl border border-gray-200">
											<h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
												<User className="w-4 h-4" /> 팀원
											</h4>
											<div className="flex flex-wrap gap-2">
												{project.members && project.members.map((m, i) => (
													<span key={i} className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
														{m}
													</span>
												))}
											</div>
										</div>

										<div className="mt-6">
											<a href={project.url} target="_blank" rel="noopener noreferrer" className="block w-full bg-kakao-yellow text-kakao-black text-center py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors">
												서비스 보러가기
											</a>
										</div>
									</div>

									{/* Right: Comments */}
									<div className="flex flex-col bg-white">
										<div className="p-6 pb-0">
											<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
												댓글 <span className="text-kakao-yellow">{comments.length}</span>
											</h3>
										</div>

										{/* Comment List */}
										<div className="px-6 space-y-4 mb-4">
											{comments.length === 0 ? (
												<div className="text-center text-gray-400 py-12">
													첫 번째 댓글을 남겨주세요! 👋
												</div>
											) : (
												comments.map((comment) => (
													<div key={comment.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 group">
														<div className="flex justify-between items-start mb-2">
															<div className="flex items-center gap-2">
																<span className="font-bold text-sm text-gray-900">{comment.author}</span>
																<span className="text-xs text-gray-400">
																	{comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}
																</span>
															</div>
															<button
																onClick={() => handleDeleteClick(comment.id)}
																className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
														<p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
													</div>
												))
											)}
										</div>

										{/* Comment Form */}
										<div className="p-6 pt-4 border-t border-gray-100 mt-auto">
											<form onSubmit={handleCommentSubmit}>
												<div className="grid grid-cols-2 gap-2 mb-2">
													<input
														type="text"
														placeholder="작성자 이름"
														value={authorName}
														onChange={(e) => setAuthorName(e.target.value)}
														required
														className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
													/>
													<input
														type="password"
														placeholder="비밀번호 (삭제용)"
														value={password}
														onChange={(e) => setPassword(e.target.value)}
														required
														className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
													/>
												</div>
												<div className="flex gap-2">
													<input
														type="text"
														placeholder="응원의 댓글을 남겨주세요! (비속어 금지)"
														value={newComment}
														onChange={(e) => setNewComment(e.target.value)}
														required
														className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
													/>
													<button
														type="submit"
														disabled={isSubmitting}
														className="bg-kakao-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
													>
														<Send className="w-4 h-4" />
													</button>
												</div>
											</form>
										</div>
									</div>
								</div>
							</div>
						</div>
					</motion.div>

					<PasswordModal
						isOpen={isPasswordModalOpen}
						onClose={() => setIsPasswordModalOpen(false)}
						onVerify={handlePasswordVerify}
						title="댓글 삭제"
						description="댓글 작성 시 설정한 비밀번호를 입력해주세요."
					/>
				</>
			)}
		</AnimatePresence>
	);
};

export default ProjectDetailModal;
