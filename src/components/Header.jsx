import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

const Header = ({ onRegister }) => {
	return (
		<header className="bg-white border-b border-gray-200 sticky top-0 z-10">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<h1 className="text-xl font-bold text-kakao-black tracking-tight">
						KTB3기 AI 해커톤 갤러리
					</h1>
				</div>
				<button
					onClick={onRegister}
					className="bg-kakao-yellow text-kakao-black px-4 py-2 rounded-md font-medium text-sm hover:bg-yellow-400 transition-colors flex items-center space-x-2"
				>
					<Plus className="h-4 w-4" />
					<span>프로젝트 등록하기</span>
				</button>
			</div>
		</header>
	);
};

export default Header;
