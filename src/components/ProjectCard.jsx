import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Edit2, Heart } from 'lucide-react';
import { toggleLike } from '../lib/firebase';

const ProjectCard = ({ project, onEdit }) => {
	const [isLiking, setIsLiking] = useState(false);
	const sessionId = localStorage.getItem('hackathon_session_id');
	const isLiked = project.likedBy?.includes(sessionId);

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
			className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 flex flex-col h-full group relative"
		>
			<div className="relative aspect-video overflow-hidden bg-gray-100">
				{project.imageUrl ? (
					<img
						src={project.imageUrl}
						alt={project.title}
						className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
						onError={(e) => {
							e.target.src = "https://via.placeholder.com/640x360?text=No+Image";
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-400">
						<span className="text-sm">이미지 준비중</span>
					</div>
				)}

				{/* Team Badge */}
				{project.team && (
					<div className="absolute top-3 left-3 bg-kakao-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">
						{project.team}
					</div>
				)}

				{/* Edit Button */}
				<button
					onClick={handleEditClick}
					className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full text-gray-600 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm z-10"
					title="수정하기"
				>
					<Edit2 className="w-3.5 h-3.5" />
				</button>
			</div>

			<div className="p-5 flex-1 flex flex-col">
				{/* Tags */}
				{project.tags && project.tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mb-3">
						{project.tags.map((tag, idx) => (
							<span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getTagStyle(tag)}`}>
								{tag}
							</span>
						))}
					</div>
				)}

				{/* Members */}
				{project.members && project.members.length > 0 && (
					<div className="flex flex-wrap gap-1 mb-2">
						{project.members.map((member, idx) => (
							<span key={idx} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
								{member}
							</span>
						))}
					</div>
				)}

				<h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
					{project.title}
				</h3>
				<p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1 break-keep">
					{project.description}
				</p>

				<div className="mt-auto w-full flex space-x-2">
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

					<a
						href={project.url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-gray-50 hover:bg-kakao-yellow hover:text-kakao-black text-gray-700 rounded-lg text-sm font-bold transition-colors"
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
