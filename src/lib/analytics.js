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
