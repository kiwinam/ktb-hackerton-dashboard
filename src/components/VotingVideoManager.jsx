import { AlertCircle, CheckCircle2, RefreshCw, Trash2, Upload, Video } from 'lucide-react';

const formatFileSize = (bytes) => {
	if (!Number.isFinite(bytes) || bytes <= 0) return '';
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const formatDuration = (seconds) => {
	if (!Number.isFinite(seconds) || seconds <= 0) return '';
	const minutes = Math.floor(seconds / 60);
	const remainSeconds = Math.round(seconds % 60).toString().padStart(2, '0');
	return `${minutes}:${remainSeconds}`;
};

const VotingVideoManager = ({ projects, uploadStateByProject, onUpload, onDelete, maxSizeMb, maxDurationSeconds }) => {
	const uploadedCount = projects.filter((project) => project.votingVideo?.downloadUrl).length;

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/15">
				<div className="flex gap-2.5">
					<Video className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
					<div>
						<p className="text-xs font-bold text-blue-900 dark:text-blue-100">ELO 참여 팀의 투표 영상 관리</p>
						<p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
							MP4 파일만 업로드할 수 있으며, 팀별 영상은 ELO 투표 화면에서 썸네일 대신 재생됩니다. 최대 {maxSizeMb}MB · {Math.floor(maxDurationSeconds / 60)}분 {maxDurationSeconds % 60}초 이내
						</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-bold text-gray-700 dark:text-gray-200">영상 등록 현황</p>
				<span className="rounded-md bg-green-100 px-2 py-1 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
					{uploadedCount} / {projects.length}팀 등록
				</span>
			</div>

			{projects.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
					<AlertCircle className="mx-auto mb-2 h-5 w-5 text-gray-400" />
					<p className="text-xs text-gray-400">먼저 기본 설정 탭에서 ELO 참여 팀을 선택해주세요.</p>
				</div>
			) : (
				<div className="space-y-2.5">
					{projects.map((project) => {
						const video = project.votingVideo;
						const uploadState = uploadStateByProject[project.id];
						const isUploading = Boolean(uploadState?.isUploading);
						return (
							<div key={project.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-700 dark:bg-gray-900">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="min-w-0">
										<p className="truncate text-xs font-bold text-gray-900 dark:text-white">{project.team || '팀명 없음'} · {project.title}</p>
										{video?.downloadUrl ? (
											<div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
												<CheckCircle2 className="h-3.5 w-3.5" />
												<span>등록됨{video.durationSeconds ? ` · ${formatDuration(video.durationSeconds)}` : ''}{video.size ? ` · ${formatFileSize(video.size)}` : ''}</span>
											</div>
										) : (
											<p className="mt-1 text-[11px] text-gray-400">등록된 투표 영상이 없습니다.</p>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-2">
										<label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-green-600 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
											<input
												type="file"
												accept="video/mp4,.mp4"
												className="sr-only"
												disabled={isUploading}
												onChange={(event) => {
													const [file] = event.target.files || [];
													event.target.value = '';
													if (file) onUpload(project, file);
												}}
											/>
											{isUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
											<span>{isUploading ? `${uploadState.progress || 0}% 업로드 중` : video?.downloadUrl ? '영상 교체' : '영상 업로드'}</span>
										</label>
										{video?.downloadUrl && (
											<button type="button" onClick={() => onDelete(project)} disabled={isUploading} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-2 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-900/20">
												<Trash2 className="h-3.5 w-3.5" />
												<span>삭제</span>
											</button>
										)}
									</div>
								</div>
								{isUploading && (
									<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
										<div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${uploadState.progress || 0}%` }} />
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default VotingVideoManager;
