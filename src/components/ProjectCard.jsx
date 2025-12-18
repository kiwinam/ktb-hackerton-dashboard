import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Edit2, Heart, MessageCircle } from 'lucide-react';
import { toggleLike, subscribeToComments } from '../lib/firebase';

const ProjectCard = ({ project, onEdit, onClick }) => {
	const [isLiking, setIsLiking] = useState(false);
	const [commentCount, setCommentCount] = useState(0);
	const sessionId = localStorage.getItem('hackathon_session_id');
	const isLiked = project.likedBy?.includes(sessionId);

	// Subscribe to comments count
	React.useEffect(() => {
		const unsubscribe = subscribeToComments(project.id, (comments) => {
			setCommentCount(comments.length);
		});
		return () => unsubscribe();
	}, [project.id]);

	const handleEditClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		onEdit(project);
	};

	const handleLike = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (isLiking) return;

		setIsLiking(true);
		await toggleLike(project.id, sessionId);
		setIsLiking(false);
	};

	const getTagStyle = (tag) => {
		const colors = [
			'bg-red-100 text-red-600 border-red-200',
			'bg-orange-100 text-orange-600 border-orange-200',
			'bg-amber-100 text-amber-600 border-amber-200',
			'bg-green-100 text-green-600 border-green-200',
			'bg-teal-100 text-teal-600 border-teal-200',
			'bg-blue-100 text-blue-600 border-blue-200',
			'bg-indigo-100 text-indigo-600 border-indigo-200',
			'bg-purple-100 text-purple-600 border-purple-200',
			'bg-pink-100 text-pink-600 border-pink-200',
			'bg-rose-100 text-rose-600 border-rose-200'
		];

		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}

		const index = Math.abs(hash) % colors.length;
		return colors[index];
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			onClick={onClick}
			className="bg-white rounded-xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-[480px] group relative cursor-pointer ring-1 ring-gray-100 hover:ring-kakao-yellow/50"
		>
			<div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
				{project.imageUrl ? (
					<img
						src={project.imageUrl}
						alt={project.title}
						className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
						onError={(e) => {
							e.target.src = "https://via.placeholder.com/640x360?text=No+Image";
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-400">
						<span className="text-sm">이미지 준비중</span>
					</div>
				)}

				<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

				{/* Team Badge */}
				{project.team && (
					<div className="absolute top-3 left-3 bg-kakao-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10 shadow-lg">
						{project.team}
					</div>
				)}

				{/* Edit Button */}
				<button
					onClick={handleEditClick}
					className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-10 transform translate-y-2 group-hover:translate-y-0"
					title="수정하기"
				>
					<Edit2 className="w-4 h-4" />
				</button>
			</div>

			<div className="p-5 flex-1 flex flex-col overflow-hidden relative">
				{/* Tags - Truncate long tags */}
				<div className="h-6 mb-2 overflow-hidden flex flex-wrap gap-1.5">
					{project.tags && project.tags.map((tag, idx) => (
						<span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium truncate max-w-[100px] inline-block ${getTagStyle(tag)}`}>
							{tag}
						</span>
					))}
				</div>

				{/* Members - Force 1 line */}
				<div className="h-5 mb-2 overflow-hidden text-xs text-gray-500 flex flex-nowrap gap-1 items-center">
					{project.members && project.members.map((member, idx) => (
						<span key={idx} className="bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
							{member}
						</span>
					))}
				</div>

				<h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-kakao-black transition-colors">
					{project.title}
				</h3>
				<p className="text-gray-600 text-sm mb-auto line-clamp-1 h-5">
					{project.description}
				</p>

				<div className="mt-auto w-full flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<button
							onClick={handleLike}
							className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-lg text-sm font-bold transition-all border ${isLiked
								? 'bg-red-50 text-red-500 border-red-100'
								: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
								}`}
						>
							<Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
							<span>{project.likes || 0}</span>
						</button>

						<div className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-lg text-sm font-bold bg-white text-gray-500 border border-gray-200">
							<MessageCircle className="w-4 h-4" />
							<span>{commentCount}</span>
						</div>
					</div>

					<a
						href={project.url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => e.stopPropagation()}
						className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gray-50 hover:bg-kakao-yellow hover:text-kakao-black text-gray-700 rounded-lg text-sm font-bold transition-colors"
					>
						<span>보러가기</span>
						<ExternalLink className="w-4 h-4" />
					</a>
				</div>
			</div>
		</motion.div>
	);
};

export default ProjectCard;
