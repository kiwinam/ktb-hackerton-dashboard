import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { X, Send, Trash2, Calendar, User, Edit2, Check, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addComment, subscribeToComments, deleteComment, updateComment, verifyCommentPassword } from '../lib/firebase';
import PasswordModal from './PasswordModal';
import ConfirmModal from './ConfirmModal';
import { checkProfanity } from '../lib/profanityFilter';

const ProjectDetailModal = ({ project, isOpen, onClose, onCommentSuccess, showToast }) => {
	const [comments, setComments] = useState([]);
	const [newComment, setNewComment] = useState('');
	const [authorName, setAuthorName] = useState('');
	const [password, setPassword] = useState('');
	const [deleteTargetId, setDeleteTargetId] = useState(null);
	const [editTargetId, setEditTargetId] = useState(null); // ID of comment being edited (password verified)
	const [editingId, setEditingId] = useState(null); // ID of comment currently being edited (inline)
	const [editContent, setEditContent] = useState('');
	const [editPassword, setEditPassword] = useState('');

	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
	const [passwordModalMode, setPasswordModalMode] = useState('delete'); // 'delete' or 'edit'

	const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
	const [pendingDeletePassword, setPendingDeletePassword] = useState(null);

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
		// Profanity Check
		if (checkProfanity(newComment)) {
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
			if (onCommentSuccess) onCommentSuccess("댓글이 등록되었습니다!");
		} else {
			alert("댓글 등록에 실패했습니다.");
		}
	};

	const handleDeleteClick = (commentId) => {
		setDeleteTargetId(commentId);
		setPasswordModalMode('delete');
		setIsPasswordModalOpen(true);
	};

	const handleEditClick = (commentId) => {
		setEditTargetId(commentId);
		setPasswordModalMode('edit');
		setIsPasswordModalOpen(true);
	};

	const handlePasswordVerify = async (inputPassword) => {
		if (passwordModalMode === 'delete') {
			const result = await verifyCommentPassword(project.id, deleteTargetId, inputPassword);
			if (result.success) {
				// Password matches! Close password modal and open confirmation
				setIsPasswordModalOpen(false);
				setPendingDeletePassword(inputPassword);
				setIsConfirmModalOpen(true);
				return true;
			} else {
				// PasswordModal handles UI error
				return false;
			}
		} else if (passwordModalMode === 'edit') {
			const result = await verifyCommentPassword(project.id, editTargetId, inputPassword);
			if (result.success) {
				setIsPasswordModalOpen(false);
				setEditPassword(inputPassword);

				const commentToEdit = comments.find(c => c.id === editTargetId);
				if (commentToEdit) {
					setEditContent(commentToEdit.content);
					setEditingId(editTargetId);
				}
				setEditTargetId(null);
				return true;
			} else {
				if (showToast) showToast("비밀번호가 일치하지 않습니다.", 'error');
				return false;
			}
		}
	};

	const handleSaveEdit = async () => {
		if (!editContent.trim()) return;

		if (checkProfanity(editContent)) {
			alert("비속어가 포함된 댓글은 등록할 수 없습니다. 바르고 고운 말을 써주세요! 😊");
			return;
		}

		console.log("Updating comment:", editingId);
		const result = await updateComment(project.id, editingId, editPassword, editContent);
		if (result.success) {
			setEditingId(null);
			setEditPassword('');
			setEditContent('');
			if (showToast) showToast("댓글이 수정되었습니다!", 'success');
		} else {
			if (showToast) showToast("댓글 수정에 실패했습니다.", 'error');
		}
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditPassword('');
		setEditContent('');
	};




	const handleConfirmDelete = async () => {
		if (deleteTargetId && pendingDeletePassword) {
			await deleteComment(project.id, deleteTargetId, pendingDeletePassword);
			setDeleteTargetId(null);
			setPendingDeletePassword(null);
			if (showToast) showToast("댓글이 삭제되었습니다!", 'success');
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
								<div className="flex flex-col">
									{/* Top: Project Details */}
									<div className="p-6 border-b border-gray-100 bg-gray-50">
										<div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6 bg-white">
											{project.imageUrl ? (
												<img src={project.imageUrl} alt={project.title} className="w-full h-auto object-cover max-h-[400px]" />
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

										<div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-8 break-keep">
											<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{project.description}</ReactMarkdown>
										</div>

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

									{/* Bottom: Comments */}
									<div className="flex flex-col bg-white">
										<div className="p-6 pb-0">
											<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
												댓글 <span className="text-kakao-yellow">{comments.length}</span>
											</h3>
										</div>

										{/* Comment Form (Moved to Top) */}
										<div className="px-6 pb-6">
											<form onSubmit={handleCommentSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
												<div className="grid grid-cols-2 gap-2 mb-2">
													<input
														type="text"
														placeholder="작성자 이름"
														value={authorName}
														onChange={(e) => setAuthorName(e.target.value)}
														required
														className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
													/>
													<input
														type="password"
														placeholder="비밀번호 (숫자 4자리)"
														value={password}
														onChange={(e) => {
															const val = e.target.value.replace(/[^0-9]/g, '');
															setPassword(val);
														}}
														required
														maxLength={4}
														inputMode="numeric"
														pattern="[0-9]*"
														autoComplete="new-password"
														className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
													/>
												</div>
												<div className="flex gap-2">
													<input
														type="text"
														placeholder="응원의 댓글을 남겨주세요! (최대 100자, 비속어 금지)"
														value={newComment}
														onChange={(e) => setNewComment(e.target.value)}
														required
														maxLength={100}
														className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
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

										{/* Comment List */}
										<div className="px-6 space-y-4 mb-8">
											{comments.length === 0 ? (
												<div className="text-center text-gray-400 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
													첫 번째 댓글을 남겨주세요! 👋
												</div>
											) : (
												comments.map((comment) => (
													<div key={comment.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 group hover:shadow-sm transition-shadow">
														{editingId === comment.id ? (
															// Inline Edit Mode
															<div className="space-y-2">
																<div className="flex items-center justify-between mb-2">
																	<span className="font-bold text-sm text-gray-900">{comment.author}</span>
																	<span className="text-xs text-kakao-brown font-bold animate-pulse">수정 중...</span>
																</div>
																<textarea
																	value={editContent}
																	onChange={(e) => setEditContent(e.target.value)}
																	className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
																	rows={3}
																	maxLength={100}
																/>
																<div className="flex justify-end gap-2 mt-2">
																	<button
																		onClick={handleCancelEdit}
																		className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md transition-colors flex items-center gap-1"
																	>
																		<XCircle className="w-3 h-3" /> 취소
																	</button>
																	<button
																		onClick={handleSaveEdit}
																		className="px-3 py-1.5 text-xs font-bold text-kakao-black bg-kakao-yellow rounded-md hover:bg-yellow-400 transition-colors flex items-center gap-1"
																	>
																		<Check className="w-3 h-3" /> 저장
																	</button>
																</div>
															</div>
														) : (
															// Normal View Mode
															<>
																<div className="flex justify-between items-start mb-2">
																	<div className="flex items-center gap-2">
																		<span className="font-bold text-sm text-gray-900">{comment.author}</span>
																		<span className="text-xs text-gray-400">
																			{comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}
																		</span>
																		{comment.updatedAt && (
																			<span className="text-xs text-gray-400">(수정됨)</span>
																		)}
																	</div>
																	<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
																		<button
																			onClick={() => handleEditClick(comment.id)}
																			className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
																			title="수정"
																		>
																			<Edit2 className="w-4 h-4" />
																		</button>
																		<button
																			onClick={() => handleDeleteClick(comment.id)}
																			className="p-1 text-gray-400 hover:text-red-500 transition-colors"
																			title="삭제"
																		>
																			<Trash2 className="w-4 h-4" />
																		</button>
																	</div>
																</div>
																<p className="text-gray-700 text-sm whitespace-pre-wrap break-all">{comment.content}</p>
															</>
														)}
													</div>
												))
											)}
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
						title={passwordModalMode === 'delete' ? "댓글 삭제" : "댓글 수정"}
						description={passwordModalMode === 'delete' ? "댓글을 삭제하려면 비밀번호를 입력하세요." : "댓글 내용을 수정하려면 비밀번호를 입력하세요."}
					/>

					<ConfirmModal
						isOpen={isConfirmModalOpen}
						onClose={() => setIsConfirmModalOpen(false)}
						onConfirm={handleConfirmDelete}
						title="댓글 삭제"
						description="정말로 댓글을 삭제하시겠습니까?&#10;삭제된 댓글은 복구할 수 없습니다."
						confirmText="삭제하기"
						isDangerous={true}
					/>
				</>
			)}
		</AnimatePresence>
	);
};

export default ProjectDetailModal;
