// Analytics utility module for Google Analytics (gtag.js)
const GA_MEASUREMENT_ID = 'G-CZBSB4PET4';

// Helper to check if gtag is available
const isGtagAvailable = () => typeof window !== 'undefined' && typeof window.gtag === 'function';

/**
 * Log a page or screen view
 * @param {string} screenName - Screen or page name (e.g. 'gallery', 'vote', 'admin', 'project_detail')
 * @param {string} [title] - Optional title
 */
export const logScreenView = (screenName, title = '') => {
	if (!isGtagAvailable()) return;
	window.gtag('event', 'screen_view', {
		screen_name: screenName,
		page_title: title || screenName,
		send_to: GA_MEASUREMENT_ID
	});
};

/**
 * Log custom events
 * @param {string} eventName - Name of the event
 * @param {Object} [params] - Event parameters
 */
export const logCustomEvent = (eventName, params = {}) => {
	if (!isGtagAvailable()) return;
	window.gtag('event', eventName, {
		...params,
		send_to: GA_MEASUREMENT_ID
	});
};

// Custom functions for business-critical actions
export const trackProjectView = (projectId, projectTitle, teamName) => {
	logCustomEvent('view_project', {
		project_id: projectId,
		project_title: projectTitle,
		team_name: teamName
	});
};

export const trackProjectLinkClick = (projectId, projectTitle, targetUrl) => {
	logCustomEvent('click_project_link', {
		project_id: projectId,
		project_title: projectTitle,
		target_url: targetUrl
	});
};

export const trackLikeProject = (projectId, projectTitle, isLike) => {
	logCustomEvent(isLike ? 'like_project' : 'unlike_project', {
		project_id: projectId,
		project_title: projectTitle
	});
};

export const trackAddComment = (projectId, projectTitle, author) => {
	logCustomEvent('add_comment', {
		project_id: projectId,
		project_title: projectTitle,
		author: author
	});
};

export const trackDeleteComment = (projectId, projectTitle, author) => {
	logCustomEvent('delete_comment', {
		project_id: projectId,
		project_title: projectTitle,
		author: author
	});
};

export const trackProjectRegister = (generation, title, team) => {
	logCustomEvent('register_project', {
		generation: generation,
		project_title: title,
		team_name: team
	});
};

export const trackProjectEdit = (projectId, title, team) => {
	logCustomEvent('edit_project', {
		project_id: projectId,
		project_title: title,
		team_name: team
	});
};

export const trackProjectDelete = (projectId, title) => {
	logCustomEvent('delete_project', {
		project_id: projectId,
		project_title: title
	});
};

export const trackVoteMatchup = (winnerId, winnerTitle, loserId, loserTitle) => {
	logCustomEvent('vote_matchup', {
		winner_id: winnerId,
		winner_title: winnerTitle,
		loser_id: loserId,
		loser_title: loserTitle
	});
};

export const trackVotingSettingsSave = (generation, isActive) => {
	logCustomEvent('save_voting_settings', {
		generation: generation,
		is_active: isActive
	});
};

export const trackSortChange = (sortBy) => {
	logCustomEvent('sort_projects', {
		sort_by: sortBy
	});
};

export const trackGenerationChange = (generation) => {
	logCustomEvent('change_generation', {
		generation: generation
	});
};

export const trackThemeToggle = (theme) => {
	logCustomEvent('toggle_theme', {
		theme: theme
	});
};

export const trackModalCancel = (modalName) => {
	logCustomEvent('cancel_modal', {
		modal_name: modalName
	});
};

export const trackVoterAuth = (success, course = '', generation = '', errorReason = '') => {
	logCustomEvent('voter_auth', {
		success: success,
		course: course,
		generation: generation,
		error_reason: errorReason
	});
};

export const trackVoterLogout = () => {
	logCustomEvent('voter_logout');
};

export const trackAdminAuth = (success, errorReason = '') => {
	logCustomEvent('admin_auth', {
		success: success,
		error_reason: errorReason
	});
};

export const trackAdminLogout = () => {
	logCustomEvent('admin_logout');
};

export const trackViewMoreDeployments = (projectId, projectTitle) => {
	logCustomEvent('view_more_deployments', {
		project_id: projectId,
		project_title: projectTitle
	});
};

export const trackSelectRegisterCourseTab = (course) => {
	logCustomEvent('select_register_course_tab', { course: course });
};

export const trackAddTag = (tag) => {
	logCustomEvent('add_tag', { tag: tag });
};

export const trackRemoveTag = (tag) => {
	logCustomEvent('remove_tag', { tag: tag });
};

export const trackFetchOgImage = (success, url) => {
	logCustomEvent('fetch_og_image', {
		success: success,
		url: url
	});
};

export const trackProfanityBlock = (projectId, projectTitle, author) => {
	logCustomEvent('comment_profanity_blocked', {
		project_id: projectId,
		project_title: projectTitle,
		author: author
	});
};

export const trackAddDeploymentLog = (projectId, projectTitle, version) => {
	logCustomEvent('add_deployment_log', {
		project_id: projectId,
		project_title: projectTitle,
		version: version
	});
};

export const trackDeleteDeploymentLog = (projectId, projectTitle) => {
	logCustomEvent('delete_deployment_log', {
		project_id: projectId,
		project_title: projectTitle
	});
};

/**
 * Set Google Analytics user properties
 * @param {Object} properties - User properties (e.g. { age_group: '20s', device_category: 'mobile', course: '인공지능', generation: 4 })
 */
export const setUserProperties = (properties) => {
	if (!isGtagAvailable()) return;
	window.gtag('set', 'user_properties', properties);
};

export const getDeviceType = () => {
	const ua = typeof window !== 'undefined' ? navigator.userAgent : '';
	if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
		return 'tablet';
	}
	if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
		return 'mobile';
	}
	return 'desktop';
};

export const getDeviceOS = () => {
	const ua = typeof window !== 'undefined' ? navigator.userAgent : '';
	if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
	if (/Android/.test(ua)) return 'Android';
	if (/Macintosh/.test(ua)) return 'macOS';
	if (/Windows/.test(ua)) return 'Windows';
	if (/Linux/.test(ua)) return 'Linux';
	return 'unknown';
};

export const parseBirthYear = (birthdateStr) => {
	if (!birthdateStr || birthdateStr.length < 2) return null;
	const yy = parseInt(birthdateStr.substring(0, 2), 10);
	if (isNaN(yy)) return null;
	// Assuming target student group is aged 15-55 (2000s vs 1900s)
	const year = yy > 35 ? 1900 + yy : 2000 + yy;
	return year;
};

export const getAgeGroup = (birthYear) => {
	if (!birthYear) return 'unknown';
	const currentYear = new Date().getFullYear();
	const age = currentYear - birthYear;
	if (age < 20) return 'under_20';
	if (age < 25) return '20-24';
	if (age < 30) return '25-29';
	if (age < 35) return '30-34';
	if (age < 40) return '35-39';
	return '40_and_over';
};
