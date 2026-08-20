const getProjectGeneration = (project) => Number(project?.generation) || 3;

const getLikeCount = (project) => {
	const likes = Number(project?.likes);
	return Number.isFinite(likes) && likes > 0 ? likes : 0;
};

export const buildProjectLikeRanking = (projects = [], generation) => (
	projects
		.filter((project) => getProjectGeneration(project) === Number(generation))
		.map((project) => ({
			"프로젝트명": project.title || '제목 없음',
			"팀/조": project.team || '조 정보 없음',
			"좋아요 수": getLikeCount(project)
		}))
		.sort((left, right) => (
			right["좋아요 수"] - left["좋아요 수"]
			|| left["프로젝트명"].localeCompare(right["프로젝트명"], 'ko-KR')
		))
		.map((project, index) => ({
			"순위": index + 1,
			...project
		}))
);
