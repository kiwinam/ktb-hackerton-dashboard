import React from 'react';

const ProjectCardSkeleton = () => {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-[430px] animate-pulse">
			{/* Image Skeleton */}
			<div className="h-44 bg-gray-200 dark:bg-gray-700 w-full flex-shrink-0" />

			<div className="p-4 flex-1 flex flex-col overflow-hidden relative">
				{/* Tags Skeleton */}
				<div className="flex gap-1.5 mb-2">
					<div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
					<div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
					<div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
				</div>

				{/* Members Skeleton */}
				<div className="flex gap-1 mb-2">
					<div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
					<div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
				</div>

				{/* Title Skeleton */}
				<div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />

				{/* Description Skeleton */}
				<div className="h-5 w-full bg-gray-200 dark:bg-gray-700 rounded mb-auto" />

				{/* Bottom Buttons Skeleton */}
				<div className="mt-auto w-full flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
						<div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
					</div>
					<div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
				</div>
			</div>
		</div>
	);
};

export default ProjectCardSkeleton;
