import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { COLLECTIONS, IS_DEVELOPMENT_DATA, getStoragePath } from './environment';
import { isStudentActive, normalizeStudentInput } from './studentManagement';

const firebaseConfig = {
	apiKey: "AIzaSyCm0Bul1xpqu6SejQyEJKlvRtarWSc7Jv0",
	authDomain: "ktb-project-dashboard.firebaseapp.com",
	projectId: "ktb-project-dashboard",
	storageBucket: "ktb-project-dashboard.firebasestorage.app",
	messagingSenderId: "223321006077",
	appId: "1:223321006077:web:afbf57c9a724f8f818c394",
	measurementId: "G-CZBSB4PET4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let storageInstance = null;
const getStorageInstance = async () => {
	if (!storageInstance) {
		const { getStorage } = await import("firebase/storage");
		storageInstance = getStorage(app);
	}
	return storageInstance;
};

const uploadToStorage = async (path, thumbBlob) => {
	const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
	const store = await getStorageInstance();
	const storageRef = ref(store, getStoragePath(path));
	await uploadBytes(storageRef, thumbBlob, {
		contentType: thumbBlob.type,
		cacheControl: 'public,max-age=31536000'
	});
	return await getDownloadURL(storageRef);
};

/**
 * 외부 이미지 URL을 fetch → Blob URL 변환 → Canvas 리사이즈 후
 * Firebase Storage에 WebP로 업로드하고 Download URL을 반환합니다.
 *
 * CORS 우회 전략:
 * 1) 직접 fetch 시도 (CORS 허용 서버는 바로 성공)
 * 2) 실패 시 corsproxy.io 경유 fetch (GitHub 등 CORS 미지원 서버)
 * Blob URL은 same-origin으로 처리되므로 Canvas taint 없이 toBlob() 가능.
 *
 * @param {string} imageUrl  - 원본 이미지 URL
 * @param {string} projectId - 프로젝트 ID (Storage 경로에 사용)
 * @returns {Promise<string|null>} CDN Download URL 또는 null
 */
export const uploadThumbnailFromUrl = async (imageUrl, projectId) => {
	const MAX_SIZE = 640;
	const QUALITY = 0.82;

	/**
	 * 이미지를 fetch해서 Blob으로 반환.
	 * 직접 fetch 실패 시 images.weserv.nl (이미지 전용 CDN 프록시, GitHub 지원) 경유.
	 * weserv.nl은 서버에서 최대 640px WebP 리사이즈까지 처리해주므로
	 * 프록시 경유 시에는 Canvas 리사이즈 단계도 생략합니다.
	 * @returns {{ blob: Blob, alreadyResized: boolean }}
	 */
	const fetchAsBlob = async (url) => {
		// 1차: 직접 fetch (CORS 허용 서버)
		try {
			const res = await fetch(url);
			if (res.ok) return { blob: await res.blob(), alreadyResized: false };
		} catch (_) { /* CORS or network error → proxy fallback */ }

		// 2차: images.weserv.nl - 이미지 전용 CDN 프록시 (GitHub, Twitter 등 지원)
		// 서버 사이드 리사이즈(w=640, WebP, q=82) + CORS 헤더 자동 추가
		try {
			const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${MAX_SIZE}&output=webp&q=${Math.round(QUALITY * 100)}&maxage=7d`;
			const res = await fetch(weservUrl);
			if (res.ok) return { blob: await res.blob(), alreadyResized: true }; // 이미 리사이즈됨
		} catch (_) { /* proxy error → next fallback */ }

		// 3차: allorigins.win (범용 CORS 프록시)
		try {
			const alloriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
			const res = await fetch(alloriginsUrl);
			if (res.ok) return { blob: await res.blob(), alreadyResized: false };
		} catch (_) { /* all proxies failed */ }

		throw new Error('모든 프록시 시도 실패 - 원본 URL 유지');
	};

	/** Blob → Blob URL → Canvas 리사이즈 → 결과 Blob */
	const resizeBlob = (srcBlob) => new Promise((resolve, reject) => {
		const blobUrl = URL.createObjectURL(srcBlob);
		const img = new Image();

		img.onload = () => {
			URL.revokeObjectURL(blobUrl); // 메모리 해제

			let { naturalWidth: w, naturalHeight: h } = img;
			if (w > MAX_SIZE || h > MAX_SIZE) {
				if (w >= h) { h = Math.round((h * MAX_SIZE) / w); w = MAX_SIZE; }
				else { w = Math.round((w * MAX_SIZE) / h); h = MAX_SIZE; }
			}

			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			canvas.getContext('2d').drawImage(img, 0, 0, w, h);

			// WebP 지원 여부 확인
			const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
				? 'image/webp' : 'image/jpeg';

			canvas.toBlob(
				(b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
				mimeType,
				QUALITY
			);
		};

		img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Image render failed')); };
		img.src = blobUrl; // Blob URL은 same-origin → crossOrigin 불필요
	});

	try {
		const { blob: srcBlob, alreadyResized } = await fetchAsBlob(imageUrl);

		// 프록시가 이미 리사이즈한 경우(weserv.nl) Canvas 단계 생략
		const thumbBlob = alreadyResized ? srcBlob : await resizeBlob(srcBlob);

		const ext = thumbBlob.type === 'image/webp' ? 'webp' : 'jpg';
		const path = `thumbnails/${projectId}/${Date.now()}.${ext}`;
		return await uploadToStorage(path, thumbBlob);
	} catch (error) {
		console.warn('썸네일 업로드 실패 (원본 URL 유지):', error.message);
		return null;
	}
};

/**
 * 로컬 File 객체를 받아 썸네일 사이즈(최대 640px)로 리사이즈한 뒤
 * Firebase Storage에 WebP로 업로드하고 Download URL을 반환합니다.
 *
 * 로컬 파일은 Blob URL(same-origin)로 처리되므로 CORS 문제가 없습니다.
 *
 * @param {File}   file      - 업로드할 이미지 File 객체
 * @param {string} projectId - 프로젝트 ID (Storage 경로에 사용)
 * @returns {Promise<string|null>} CDN Download URL 또는 null
 */
export const uploadThumbnailFromFile = async (file, projectId) => {
	const MAX_SIZE = 640;
	const QUALITY = 0.82;

	try {
		// File → Blob URL (same-origin, CORS 없음)
		const blobUrl = URL.createObjectURL(file);

		const thumbBlob = await new Promise((resolve, reject) => {
			const img = new Image();

			img.onload = () => {
				URL.revokeObjectURL(blobUrl); // 즉시 해제

				let { naturalWidth: w, naturalHeight: h } = img;
				if (w > MAX_SIZE || h > MAX_SIZE) {
					if (w >= h) { h = Math.round((h * MAX_SIZE) / w); w = MAX_SIZE; }
					else { w = Math.round((w * MAX_SIZE) / h); h = MAX_SIZE; }
				}

				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				canvas.getContext('2d').drawImage(img, 0, 0, w, h);

				const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
					? 'image/webp' : 'image/jpeg';

				canvas.toBlob(
					(b) => b ? resolve(b) : reject(new Error('Canvas toBlob 실패')),
					mimeType,
					QUALITY
				);
			};

			img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('이미지 렌더링 실패')); };
			img.src = blobUrl;
		});

		const ext = thumbBlob.type === 'image/webp' ? 'webp' : 'jpg';
		const path = `thumbnails/${projectId}/${Date.now()}.${ext}`;
		return await uploadToStorage(path, thumbBlob);
	} catch (error) {
		console.warn('파일 썸네일 업로드 실패:', error.message);
		return null;
	}
};

const sanitizeStorageFileName = (fileName = 'video.mp4') => (
	fileName
		.normalize('NFKD')
		.replace(/[^a-zA-Z0-9._-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(-100) || 'video.mp4'
);

/**
 * ELO 투표 영상을 Firebase Storage에 업로드합니다.
 * 영상은 팀별 경로로 구분하고, 재개 가능한 업로드 진행률을 반환합니다.
 */
export const uploadVotingVideo = async (file, { projectId, generation, onProgress } = {}) => {
	if (!file || !projectId) throw new Error('업로드할 영상 또는 프로젝트 정보가 없습니다.');

	const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
	const store = await getStorageInstance();
	const safeFileName = sanitizeStorageFileName(file.name);
	const path = getStoragePath(`videos/${Number(generation) || 'unknown'}/${projectId}/${Date.now()}-${safeFileName}`);
	const storageRef = ref(store, path);
	const uploadTask = uploadBytesResumable(storageRef, file, {
		contentType: file.type || 'video/mp4',
		cacheControl: 'public,max-age=31536000,immutable',
		customMetadata: {
			projectId: String(projectId),
			generation: String(generation || '')
		}
	});

	return new Promise((resolve, reject) => {
		uploadTask.on('state_changed',
			(snapshot) => {
				const progress = snapshot.totalBytes > 0
					? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
					: 0;
				onProgress?.(progress);
			},
			reject,
			async () => {
				try {
					resolve({
						storagePath: path,
						downloadUrl: await getDownloadURL(uploadTask.snapshot.ref),
						fileName: file.name,
						contentType: file.type || 'video/mp4',
						size: file.size
					});
				} catch (error) {
					reject(error);
				}
			}
		);
	});
};

export const deleteVotingVideo = async (storagePath) => {
	if (!storagePath) return { success: true };
	try {
		const { ref, deleteObject } = await import('firebase/storage');
		const store = await getStorageInstance();
		await deleteObject(ref(store, storagePath));
		return { success: true };
	} catch (error) {
		console.error('투표 영상 삭제 실패:', error);
		return { success: false, error };
	}
};




import {
	collection,
	addDoc,
	onSnapshot,
	query,
	where,
	orderBy,
	serverTimestamp,
	doc,
	deleteDoc,
	updateDoc,
	increment,
	getDoc,
	getCountFromServer,
	limit,
	getDocs,
	setDoc,
	arrayUnion,
	arrayRemove,
	runTransaction,
	writeBatch,
	startAfter,
	documentId
} from "firebase/firestore";
import { hashPassword } from "./crypto";

const COLLECTION_NAME = COLLECTIONS.projects;
const PROJECT_SECRETS_COLLECTION = COLLECTIONS.projectSecrets;
const COMMENT_SECRETS_COLLECTION = COLLECTIONS.commentSecrets;
const RATE_LIMIT_COLLECTION = COLLECTIONS.rateLimits;
const SETTINGS_COLLECTION = COLLECTIONS.settings;
const STUDENTS_COLLECTION = COLLECTIONS.students;
const VOTES_COLLECTION = COLLECTIONS.votes;
const MATCHUPS_COLLECTION = COLLECTIONS.matchups;
const GENERATIONS_COLLECTION = COLLECTIONS.generations;

export const addProject = async (projectData) => {
	try {
		const { password, ...publicData } = projectData;
		const hashedPassword = await hashPassword(password);

		// 1. Add public project data
		const docRef = await addDoc(collection(db, COLLECTION_NAME), {
			...publicData,
			likes: 0,
			likedBy: [],
			createdAt: serverTimestamp(),
		});

		// 2. Add secret password data to separate collection with same ID
		await setDoc(doc(db, PROJECT_SECRETS_COLLECTION, docRef.id), {
			password: hashedPassword
		});

		return { success: true };
	} catch (error) {
		console.error("Error adding project: ", error);
		return { success: false, error };
	}
};

export const subscribeToProjects = (callback, onError) => {
	const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
	return onSnapshot(q,
		(snapshot) => {
			const projects = snapshot.docs.map((doc) => {
				const data = doc.data();
				// Ensure password is not leaked if it exists in data (legacy)
				const { password, ...safeData } = data;
				return {
					id: doc.id,
					...safeData,
				};
			});
			callback(projects);
		},
		(error) => {
			console.error("Firestore subscription error:", error);
			if (onError) onError(error);
		}
	);
};

export const updateProject = async (docId, data) => {
	try {
		const docRef = doc(db, COLLECTION_NAME, docId);
		await updateDoc(docRef, {
			...data,
			updatedAt: serverTimestamp(),
		});
		return { success: true };
	} catch (error) {
		console.error("Error updating project: ", error);
		return { success: false, error };
	}
};

export const toggleLike = async (docId, sessionId) => {
	try {
		const docRef = doc(db, COLLECTION_NAME, docId);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			const data = docSnap.data();
			const likedBy = data.likedBy || [];
			const hasLiked = likedBy.includes(sessionId);

			if (hasLiked) {
				await updateDoc(docRef, {
					likes: (data.likes || 1) - 1,
					likedBy: arrayRemove(sessionId)
				});
				return { liked: false };
			} else {
				await updateDoc(docRef, {
					likes: (data.likes || 0) + 1,
					likedBy: arrayUnion(sessionId)
				});
				return { liked: true };
			}
		}
	} catch (error) {
		console.error("Error toggling like:", error);
		return { error };
	}
};

export const addComment = async (projectId, commentData) => {
	try {
		const { password, ...publicData } = commentData;
		const hashedPassword = await hashPassword(password);

		// 1. Add public comment
		const docRef = await addDoc(collection(db, COLLECTION_NAME, projectId, "comments"), {
			...publicData,
			createdAt: serverTimestamp(),
		});

		// 2. Add secret password
		await setDoc(doc(db, COMMENT_SECRETS_COLLECTION, docRef.id), {
			password: hashedPassword,
			projectId: projectId // Optional: for reference if needed
		});

		// Update count
		const projectRef = doc(db, COLLECTION_NAME, projectId);
		await updateDoc(projectRef, {
			commentCount: increment(1)
		});

		return { success: true };
	} catch (error) {
		console.error("Error adding comment: ", error);
		return { success: false, error };
	}
};

export const subscribeToComments = (projectId, callback) => {
	const q = query(
		collection(db, COLLECTION_NAME, projectId, "comments"),
		orderBy("createdAt", "desc")
	);
	return onSnapshot(q, (snapshot) => {
		const comments = snapshot.docs.map((doc) => {
			const data = doc.data();
			const { password, ...safeData } = data; // Remove legacy password if present
			return {
				id: doc.id,
				...safeData,
			};
		});
		callback(comments);
	});
};

// Internal helper for verification
const _verifySecret = async (collectionName, docId, inputPassword, legacyDocRef = null) => {
	try {
		const inputHash = await hashPassword(inputPassword);
		const secretRef = doc(db, collectionName, docId);
		const secretSnap = await getDoc(secretRef);

		if (secretSnap.exists()) {
			// New secure path
			return secretSnap.data().password === inputHash;
		} else if (legacyDocRef) {
			// Fallback to legacy document
			const legacySnap = await getDoc(legacyDocRef);
			if (legacySnap.exists() && legacySnap.data().password === inputPassword) {
				return true;
			}
		}
		return false;
	} catch (e) {
		console.error("Verification error:", e);
		return false;
	}
};

export const deleteComment = async (projectId, commentId, password) => {
	try {
		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);

		const isValid = await _verifySecret(COMMENT_SECRETS_COLLECTION, commentId, password, commentRef);

		if (isValid) {
			await deleteDoc(commentRef);
			// Also try to delete secret, ignore error if doesn't exist
			try { await deleteDoc(doc(db, COMMENT_SECRETS_COLLECTION, commentId)); } catch (e) { }

			const projectRef = doc(db, COLLECTION_NAME, projectId);
			await updateDoc(projectRef, {
				commentCount: increment(-1)
			});
			return { success: true };
		} else {
			return { success: false, error: "Incorrect password" };
		}
	} catch (error) {
		console.error("Error deleting comment: ", error);
		return { success: false, error };
	}
};

export const updateComment = async (projectId, commentId, password, newContent) => {
	try {
		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);

		const isValid = await _verifySecret(COMMENT_SECRETS_COLLECTION, commentId, password, commentRef);

		if (isValid) {
			await updateDoc(commentRef, {
				content: newContent,
				updatedAt: serverTimestamp()
			});
			return { success: true };
		} else {
			return { success: false, error: "Incorrect password" };
		}
	} catch (error) {
		console.error("Error updating comment: ", error);
		return { success: false, error };
	}
};

// Rate Limiter Helper
const checkRateLimit = async (sessionId) => {
	const limitRef = doc(db, RATE_LIMIT_COLLECTION, sessionId);

	try {
		const docSnap = await getDoc(limitRef);
		const now = Date.now();
		let timestamps = [];

		if (docSnap.exists()) {
			timestamps = docSnap.data().timestamps || [];
		}

		// Filter timestamps older than 1 minute
		timestamps = timestamps.filter(t => now - t < 60000);

		if (timestamps.length >= 5) {
			return { allowed: false, error: "너무 많은 시도를 했습니다.\n1분 후에 다시 시도해주세요." };
		}

		timestamps.push(now);
		await setDoc(limitRef, { timestamps });
		return { allowed: true };
	} catch (error) {
		console.error("Rate limit check error:", error);
		// Fail open if rate limit check fails, to not block users on system error
		return { allowed: true };
	}
};

export const verifyCommentPassword = async (projectId, commentId, password, sessionId) => {
	try {
		if (sessionId) {
			const limitCheck = await checkRateLimit(sessionId);
			if (!limitCheck.allowed) return { success: false, error: limitCheck.error };
		}

		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);
		const isValid = await _verifySecret(COMMENT_SECRETS_COLLECTION, commentId, password, commentRef);

		if (isValid) {
			return { success: true };
		} else {
			return { success: false, error: "비밀번호가 일치하지 않습니다." };
		}
	} catch (error) {
		console.error("Error verifying password: ", error);
		return { success: false, error };
	}
};

export const verifyProjectPassword = async (projectId, password, sessionId) => {
	try {
		if (sessionId) {
			const limitCheck = await checkRateLimit(sessionId);
			if (!limitCheck.allowed) return { success: false, error: limitCheck.error };
		}

		const projectRef = doc(db, COLLECTION_NAME, projectId);
		const isValid = await _verifySecret(PROJECT_SECRETS_COLLECTION, projectId, password, projectRef);

		if (isValid) {
			return { success: true };
		} else {
			return { success: false, error: "비밀번호가 일치하지 않습니다." };
		}
	} catch (error) {
		console.error("Error verifying project password: ", error);
		return { success: false, error };
	}
};

export const syncCommentCounts = async () => {
	try {
		const projectsQuery = query(collection(db, COLLECTION_NAME));
		// Use getDocs instead of getCountFromServer for list
		const projectsSnap = await import("firebase/firestore").then(mod => mod.getDocs(projectsQuery));

		let updated = 0;
		for (const docSnap of projectsSnap.docs) {
			const commentsRef = collection(db, COLLECTION_NAME, docSnap.id, "comments");
			const countSnap = await getCountFromServer(commentsRef);
			const count = countSnap.data().count;

			await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
				commentCount: count
			});
			updated++;
		}
		return { success: true, count: updated };
	} catch (error) {
		console.error("Sync error:", error);
		return { success: false, error };
	}
};


// System Settings (Entry Password)
export const verifySystemPassword = async (inputPassword) => {
	try {
		const docRef = doc(db, SETTINGS_COLLECTION, "system");
		const docSnap = await getDoc(docRef);
		const inputHash = await hashPassword(inputPassword);

		if (!docSnap.exists()) {
			// Initialize with default password "1234" if not exists
			const defaultHash = await hashPassword("1234");
			await setDoc(docRef, { entryPassword: defaultHash });

			// If input matches "1234", success
			return inputPassword === "1234";
		}

		const storedHash = docSnap.data().entryPassword;
		return storedHash === inputHash;
	} catch (error) {
		console.error("System password check error:", error);
		// Fail open or closed? Closed for security.
		return false;
	}
};

// --- Deployments (Release Notes) ---

export const subscribeToDeployments = (projectId, callback, limitCount = 5) => {
	const q = query(
		collection(db, COLLECTION_NAME, projectId, "deployments"),
		orderBy("createdAt", "desc"),
		limit(limitCount)
	);

	return onSnapshot(q, (snapshot) => {
		const deployments = snapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		}));
		callback(deployments);
	});
};

export const addDeploymentLog = async (projectId, logData) => {
	try {
		await addDoc(collection(db, COLLECTION_NAME, projectId, "deployments"), {
			...logData,
			createdAt: serverTimestamp()
		});

		// Update latestVersion on the main project document
		if (logData.version) {
			await updateDoc(doc(db, COLLECTION_NAME, projectId), {
				latestVersion: logData.version
			});
		}

		return { success: true };
	} catch (error) {
		console.error("Error adding deployment log: ", error);
		return { success: false, error };
	}
};

export const updateDeploymentLog = async (projectId, logId, updateData) => {
	try {
		const logRef = doc(db, COLLECTION_NAME, projectId, "deployments", logId);
		await updateDoc(logRef, {
			...updateData,
			updatedAt: serverTimestamp()
		});

		// Check if this is the latest deployment (by checking the FIRST one in desc order)
		// A bit expensive to query again, but safe.
		// Actually, we can just check if the updated version is meant to be the "latest".
		// Better approach: Query the most recent one after update.
		const q = query(
			collection(db, COLLECTION_NAME, projectId, "deployments"),
			orderBy("createdAt", "desc"),
			limit(1)
		);

		// We need to wait a tiny bit or just fetch.
		const snapshot = await getDocs(q);
		if (!snapshot.empty) {
			const latestLog = snapshot.docs[0].data();
			// If the modified log is indeed the latest one (by date), update project latestVersion
			// Note: If we only edited content, version might be same. If we edited version, it changes.
			// We blindly update project.latestVersion to whatever the top log says now.
			await updateDoc(doc(db, COLLECTION_NAME, projectId), {
				latestVersion: latestLog.version
			});
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating deployment log: ", error);
		return { success: false, error };
	}
};

export const deleteDeploymentLog = async (projectId, logId) => {
	try {
		await deleteDoc(doc(db, COLLECTION_NAME, projectId, "deployments", logId));
		return { success: true };
	} catch (error) {
		console.error("Error deleting deployment log: ", error);
		return { success: false, error };
	}
};


export const getDeploymentCount = async (projectId) => {
	try {
		const coll = collection(db, COLLECTION_NAME, projectId, "deployments");
		const snapshot = await getCountFromServer(coll);
		return snapshot.data().count;
	} catch (error) {
		console.error("Error getting deployment count:", error);
		return 0;
	}
};

// --- ELO Voting & Settings System ---

export const subscribeToVotingSettings = (callback, onError) => {
	const docRef = doc(db, SETTINGS_COLLECTION, "voting");
	return onSnapshot(docRef,
		(docSnap) => callback(docSnap.exists() ? docSnap.data() : null),
		(error) => {
			console.error("Settings subscription error:", error);
			onError?.(error);
		}
	);
};

export const getVotingSettings = async () => {
	try {
		const docRef = doc(db, SETTINGS_COLLECTION, "voting");
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			return docSnap.data();
		} else {
			const defaultSettings = {
				isActive: !IS_DEVELOPMENT_DATA,
				generation: 4,
				startAt: null,
				startDate: "",
					// 3기는 기존 전체 팀 투표를 유지하고, 4기부터는 관리자 대상 선택이 필요합니다.
					eligibleProjectIdsByGeneration: {},
					matchPolicyByGeneration: {},
					createdAt: serverTimestamp()
				};
			await setDoc(docRef, defaultSettings);
			return defaultSettings;
		}
	} catch (error) {
		console.error("Error getting voting settings:", error);
			return { isActive: false, generation: 4, eligibleProjectIdsByGeneration: {}, matchPolicyByGeneration: {} };
	}
};

export const saveVotingSettings = async (settings) => {
	try {
		const docRef = doc(db, SETTINGS_COLLECTION, "voting");
		const hasEligibleProjectSettings = Object.prototype.hasOwnProperty.call(settings || {}, "eligibleProjectIdsByGeneration");
		const hasMatchPolicySettings = Object.prototype.hasOwnProperty.call(settings || {}, "matchPolicyByGeneration");
		const eligibleProjectIdsByGeneration = Object.entries(settings?.eligibleProjectIdsByGeneration || {}).reduce((result, [generation, projectIds]) => {
			const generationNumber = Number(generation);
			if (Number.isInteger(generationNumber) && generationNumber > 0 && Array.isArray(projectIds)) {
				result[String(generationNumber)] = [...new Set(projectIds.filter((projectId) => typeof projectId === 'string' && projectId))];
			}
			return result;
		}, {});
		const matchPolicyByGeneration = Object.entries(settings?.matchPolicyByGeneration || {}).reduce((result, [generation, policy]) => {
			const generationNumber = Number(generation);
			if (!Number.isInteger(generationNumber) || generationNumber <= 0 || !policy || typeof policy !== 'object' || Array.isArray(policy)) {
				return result;
			}

			const mode = policy.mode === 'manual' ? 'manual' : 'auto';
			const voterCount = Number(policy.voterCount);
			const finalistMemberCount = Number(policy.finalistMemberCount);
			const teamCount = Number(policy.teamCount);
			const manualMatchesPerVoter = Number(policy.manualMatchesPerVoter);
			const resolvedMatchesPerVoter = Number(policy.resolvedMatchesPerVoter);
			const initialElo = Number(policy.initialElo);
			const kFactor = Number(policy.kFactor);
			if (
				!Number.isInteger(voterCount) || voterCount <= 0
				|| !Number.isInteger(finalistMemberCount) || finalistMemberCount < 0 || finalistMemberCount > voterCount
				|| !Number.isInteger(teamCount) || teamCount < 2
				|| !Number.isInteger(resolvedMatchesPerVoter) || resolvedMatchesPerVoter <= 0
				|| !Number.isInteger(initialElo) || initialElo <= 0
				|| !Number.isInteger(kFactor) || kFactor <= 0
			) {
				return result;
			}

			result[String(generationNumber)] = {
				mode,
				voterCount,
				finalistMemberCount,
				teamCount,
				manualMatchesPerVoter: Number.isInteger(manualMatchesPerVoter) && manualMatchesPerVoter > 0
					? manualMatchesPerVoter
					: resolvedMatchesPerVoter,
				resolvedMatchesPerVoter,
				initialElo,
				kFactor,
				formulaVersion: typeof policy.formulaVersion === 'string' ? policy.formulaVersion : '',
				confidenceLevel: Number(policy.confidenceLevel) || 0.95,
				marginOfError: Number(policy.marginOfError) || 0.10,
				pairCount: Number(policy.pairCount) || 0,
				sampleSizePerPair: Number(policy.sampleSizePerPair) || 0,
				targetTotalMatches: Number(policy.targetTotalMatches) || 0,
				expectedTotalMatches: Number(policy.expectedTotalMatches) || 0
			};
			return result;
		}, {});
		const cleanSettings = {
			isActive: Boolean(settings?.isActive),
			generation: Number(settings?.generation) || 4,
			startDate: settings?.startDate ? String(settings.startDate).trim() : "",
			updatedAt: serverTimestamp()
		};
		if (Object.prototype.hasOwnProperty.call(settings || {}, "startAt")) {
			cleanSettings.startAt = settings.startAt instanceof Date && Number.isFinite(settings.startAt.getTime())
				? settings.startAt
				: null;
		}
		if (hasEligibleProjectSettings) {
			cleanSettings.eligibleProjectIdsByGeneration = eligibleProjectIdsByGeneration;
		}
		if (hasMatchPolicySettings) {
			cleanSettings.matchPolicyByGeneration = matchPolicyByGeneration;
		}
		await setDoc(docRef, cleanSettings, { merge: true });
		return { success: true };
	} catch (error) {
		console.error("Error saving voting settings:", error);
		return { success: false, error: error.message || error };
	}
};

export const verifyStudentVoter = async (generation, course, name, birthdate) => {
	try {
		const q = query(
			collection(db, STUDENTS_COLLECTION),
			where("generation", "==", Number(generation)),
			where("course", "==", course),
			where("kor_name", "==", name.trim()),
			where("birthdate", "==", birthdate.trim())
		);
		const snap = await getDocs(q);

		if (!snap.empty) {
			const docSnap = snap.docs[0];
			const studentData = docSnap.data();
			if (!isStudentActive(studentData)) {
				return {
					success: false,
					error: "현재 비활성화된 학생 계정입니다. 관리자에게 문의해주세요."
				};
			}
			return {
				success: true,
				voter: {
					email: docSnap.id,
					name: studentData.name,
					course: studentData.course,
					generation: studentData.generation,
					isAdmin: studentData.isAdmin || false
				}
			};
		} else {
			return {
				success: false,
				error: "등록된 학생 정보가 없거나 입력한 정보가 정확하지 않습니다. (과정, 이름, 생년월일 6자리를 확인해주세요)"
			};
		}
	} catch (error) {
		console.error("Error verifying student voter:", error);
		return { success: false, error: "서버 오류가 발생했습니다. 다시 시도해주세요." };
	}
};

export const seedTestStudents = async () => {
	try {
		const studentRef = collection(db, STUDENTS_COLLECTION);
		const countSnap = await getCountFromServer(studentRef);
		if (countSnap.data().count > 0) {
			return; // Already seeded
		}

		const testStudents = [
			// 3기
			{ id: "3_풀스택_홍길동_930125", generation: 3, course: "풀스택", name: "홍길동", birthdate: "930125", isAdmin: false },
			{ id: "3_풀스택_김철수_940212", generation: 3, course: "풀스택", name: "김철수", birthdate: "940212", isAdmin: false },
			{ id: "3_풀스택_이영희_950315", generation: 3, course: "풀스택", name: "이영희", birthdate: "950315", isAdmin: false },
			{ id: "3_인공지능_박민수_920420", generation: 3, course: "인공지능", name: "박민수", birthdate: "920420", isAdmin: false },
			{ id: "3_인공지능_최정우_910525", generation: 3, course: "인공지능", name: "최정우", birthdate: "910525", isAdmin: false },
			{ id: "3_클라우드_정다은_960630", generation: 3, course: "클라우드", name: "정다은", birthdate: "960630", isAdmin: false },
			{ id: "3_클라우드_강하늘_970714", generation: 3, course: "클라우드", name: "강하늘", birthdate: "970714", isAdmin: false },

			// 4기
			{ id: "4_풀스택_박지성_930225", generation: 4, course: "풀스택", name: "박지성", birthdate: "930225", isAdmin: false },
			{ id: "4_풀스택_손흥민_920708", generation: 4, course: "풀스택", name: "손흥민", birthdate: "920708", isAdmin: false },
			{ id: "4_인공지능_김연아_900905", generation: 4, course: "인공지능", name: "김연아", birthdate: "900905", isAdmin: false },
			{ id: "4_인공지능_류현진_870325", generation: 4, course: "인공지능", name: "류현진", birthdate: "870325", isAdmin: false },
			{ id: "4_클라우드_황희찬_960126", generation: 4, course: "클라우드", name: "황희찬", birthdate: "960126", isAdmin: false },
			{ id: "4_클라우드_이강인_010219", generation: 4, course: "클라우드", name: "이강인", birthdate: "010219", isAdmin: false },

			// 관리자 테스트용
			{ id: "admin_admin_admin_123456", generation: 4, course: "풀스택", name: "관리자", birthdate: "123456", isAdmin: true },
			{ id: "admin_admin_admin_123456_g3", generation: 3, course: "풀스택", name: "관리자", birthdate: "123456", isAdmin: true },
		];

		for (const student of testStudents) {
			await setDoc(doc(db, STUDENTS_COLLECTION, student.id), student);
		}
		console.log("Successfully seeded test students!");
	} catch (e) {
		console.error("Error seeding students:", e);
	}
};

// Auto seed disabled for optimization
// seedTestStudents();

export const submitVote = async (voterEmail, projectA, projectB, winner, generation, initialElo = 1500, kFactor = 32) => {
	try {
		const safeInitialElo = Number.isInteger(Number(initialElo)) && Number(initialElo) > 0 ? Number(initialElo) : 1500;
		const safeKFactor = Number.isInteger(Number(kFactor)) && Number(kFactor) > 0 ? Number(kFactor) : 32;
		const pairId = [projectA, projectB].sort().join("_");
		const voteId = `${voterEmail}_${pairId}`;

		const voteRef = doc(db, VOTES_COLLECTION, voteId);
		const studentRef = doc(db, STUDENTS_COLLECTION, voterEmail);
		const matchRef = doc(db, MATCHUPS_COLLECTION, pairId);
		const projARef = doc(db, COLLECTION_NAME, projectA);
		const projBRef = doc(db, COLLECTION_NAME, projectB);

		await runTransaction(db, async (transaction) => {
			// 1. Read necessary docs
			const [voteSnap, studentSnap, matchSnap, projASnap, projBSnap] = await Promise.all([
				transaction.get(voteRef),
				transaction.get(studentRef),
				transaction.get(matchRef),
				transaction.get(projARef),
				transaction.get(projBRef)
			]);

			if (voteSnap.exists()) {
				// Already voted on this pair
				return;
			}

			// 2. Extract current values
			const savedAScore = projASnap.exists() ? Number(projASnap.data().elo) : NaN;
			const savedBScore = projBSnap.exists() ? Number(projBSnap.data().elo) : NaN;
			const currentAScore = Number.isFinite(savedAScore) ? savedAScore : safeInitialElo;
			const currentBScore = Number.isFinite(savedBScore) ? savedBScore : safeInitialElo;

			const currentAWins = projASnap.exists() ? (projASnap.data().wins || 0) : 0;
			const currentALosses = projASnap.exists() ? (projASnap.data().losses || 0) : 0;
			const currentAMatches = projASnap.exists() ? (projASnap.data().totalMatches || 0) : 0;

			const currentBWins = projBSnap.exists() ? (projBSnap.data().wins || 0) : 0;
			const currentBLosses = projBSnap.exists() ? (projBSnap.data().losses || 0) : 0;
			const currentBMatches = projBSnap.exists() ? (projBSnap.data().totalMatches || 0) : 0;

			// 3. ELO rating change calculation
			const eA = 1 / (1 + Math.pow(10, (currentBScore - currentAScore) / 400));
			const eB = 1 / (1 + Math.pow(10, (currentAScore - currentBScore) / 400));

			const sA = winner === projectA ? 1 : 0;
			const sB = winner === projectB ? 1 : 0;

			const newAScore = Math.round(currentAScore + safeKFactor * (sA - eA));
			const newBScore = Math.round(currentBScore + safeKFactor * (sB - eB));

			// 4. Update Matchup
			let matchData = {
				projectA,
				projectB,
				generation,
				winsA: 0,
				winsB: 0,
				total: 0
			};
			if (matchSnap.exists()) {
				matchData = { ...matchData, ...matchSnap.data() };
			}
			matchData.total++;
			if (winner === projectA) {
				matchData.winsA++;
			} else {
				matchData.winsB++;
			}

			// 5. Commit updates
			transaction.set(voteRef, {
				voterEmail,
				projectA,
				projectB,
				winner,
				generation,
				timestamp: serverTimestamp()
			});

			const currentVoteCount = studentSnap.exists() ? (studentSnap.data().voteCount || 0) : 0;
			transaction.update(studentRef, {
				voteCount: currentVoteCount + 1
			});

			transaction.set(matchRef, matchData);

			transaction.update(projARef, {
				elo: newAScore,
				wins: currentAWins + (winner === projectA ? 1 : 0),
				losses: currentALosses + (winner === projectB ? 1 : 0),
				totalMatches: currentAMatches + 1
			});

			transaction.update(projBRef, {
				elo: newBScore,
				wins: currentBWins + (winner === projectB ? 1 : 0),
				losses: currentBLosses + (winner === projectA ? 1 : 0),
				totalMatches: currentBMatches + 1
			});
		});

		return { success: true };
	} catch (error) {
		console.error("Transaction failed: ", error);
		return { success: false, error };
	}
};

export const getVoterVotes = async (voterEmail) => {
	try {
		const q = query(
			collection(db, VOTES_COLLECTION),
			where("voterEmail", "==", voterEmail)
		);
		const snap = await getDocs(q);
		return snap.docs.map(doc => doc.data());
	} catch (error) {
		console.error("Error getting voter votes: ", error);
		return [];
	}
};

export const getVotesByGeneration = async (generation) => {
	try {
		const q = query(
			collection(db, VOTES_COLLECTION),
			where("generation", "==", generation)
		);
		const snap = await getDocs(q);
		return snap.docs.map(doc => doc.data());
	} catch (error) {
		console.error("Error getting votes by generation: ", error);
		return [];
	}
};

export const getGenerations = async () => {
	try {
		const coll = collection(db, GENERATIONS_COLLECTION);
		const snap = await getDocs(coll);
		if (snap.empty) {
			const defaults = [
				{ id: "gen_1", value: 1, name: "1기", order: 1, visible: true, isDefault: false },
				{ id: "gen_2", value: 2, name: "2기", order: 2, visible: true, isDefault: false },
				{ id: "gen_3", value: 3, name: "3기", order: 3, visible: true, isDefault: false },
				{ id: "gen_4", value: 4, name: "4기", order: 4, visible: true, isDefault: true },
			];
			for (const gen of defaults) {
				await setDoc(doc(db, GENERATIONS_COLLECTION, gen.id), gen);
			}
			return defaults.sort((a, b) => a.order - b.order);
		}
		return snap.docs.map(doc => {
			const data = doc.data();
			return {
				id: doc.id,
				...data,
				visible: data.visible !== undefined ? Boolean(data.visible) : true,
				isDefault: data.isDefault === true,
				order: data.order !== undefined ? Number(data.order) : 999
			};
		}).sort((a, b) => a.order - b.order);
	} catch (error) {
		console.error("Error getting generations:", error);
		return [
			{ id: "gen_1", value: 1, name: "1기", order: 1, visible: true, isDefault: false },
			{ id: "gen_2", value: 2, name: "2기", order: 2, visible: true, isDefault: false },
			{ id: "gen_3", value: 3, name: "3기", order: 3, visible: true, isDefault: false },
			{ id: "gen_4", value: 4, name: "4기", order: 4, visible: true, isDefault: true },
		];
	}
};

// --- Admin Management Functions ---

export const updateGeneration = async (genId, data) => {
	try {
		const genRef = doc(db, GENERATIONS_COLLECTION, genId);
		const payload = {
			...data,
			id: genId,
			visible: data.visible !== false
		};
		await setDoc(genRef, payload, { merge: true });
		return { success: true };
	} catch (error) {
		console.error("Error updating generation:", error);
		return { success: false, error: error.message || String(error) };
	}
};

export const deleteGeneration = async (genId) => {
	try {
		const genRef = doc(db, GENERATIONS_COLLECTION, genId);
		await deleteDoc(genRef);
		return { success: true };
	} catch (error) {
		console.error("Error deleting generation:", error);
		return { success: false, error };
	}
};

export const updateSystemPassword = async (currentPassword, newPassword) => {
	try {
		const isValid = await verifySystemPassword(currentPassword);
		if (!isValid) {
			return { success: false, error: "현재 비밀번호가 일치하지 않습니다." };
		}
		const newHash = await hashPassword(newPassword);
		const docRef = doc(db, SETTINGS_COLLECTION, "system");
		await setDoc(docRef, { entryPassword: newHash }, { merge: true });
		return { success: true };
	} catch (error) {
		console.error("Error updating system password:", error);
		return { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." };
	}
};

// System Settings (Admin Master Password)
export const verifyAdminPassword = async (inputPassword) => {
	try {
		const docRef = doc(db, SETTINGS_COLLECTION, "system");
		const docSnap = await getDoc(docRef);
		const inputHash = await hashPassword(inputPassword);

		if (!docSnap.exists()) {
			// Initialize with default admin password "1234" if not exists
			const defaultHash = await hashPassword("1234");
			await setDoc(docRef, { adminPassword: defaultHash }, { merge: true });
			return inputPassword === "1234";
		}

		const data = docSnap.data();
		// If adminPassword does not exist yet (migration phase), set as default "1234"
		if (!data.adminPassword) {
			const defaultHash = await hashPassword("1234");
			await setDoc(docRef, { adminPassword: defaultHash }, { merge: true });
			return inputPassword === "1234";
		}

		return data.adminPassword === inputHash;
	} catch (error) {
		console.error("Admin password check error:", error);
		return false;
	}
};

export const updateAdminPassword = async (currentPassword, newPassword) => {
	try {
		const isValid = await verifyAdminPassword(currentPassword);
		if (!isValid) {
			return { success: false, error: "현재 비밀번호가 일치하지 않습니다." };
		}
		const newHash = await hashPassword(newPassword);
		const docRef = doc(db, SETTINGS_COLLECTION, "system");
		await setDoc(docRef, { adminPassword: newHash }, { merge: true });
		return { success: true };
	} catch (error) {
		console.error("Error updating admin password:", error);
		return { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." };
	}
};

export const adminDeleteProject = async (projectId) => {
	try {
		// Delete subcollections (comments, deployments) first
		try {
			const commentsSnap = await getDocs(collection(db, COLLECTION_NAME, projectId, "comments"));
			for (const cDoc of commentsSnap.docs) {
				await deleteDoc(cDoc.ref);
			}
		} catch (e) {
			console.warn("Could not delete project comments:", e);
		}

		try {
			const deploymentsSnap = await getDocs(collection(db, COLLECTION_NAME, projectId, "deployments"));
			for (const dDoc of deploymentsSnap.docs) {
				await deleteDoc(dDoc.ref);
			}
		} catch (e) {
			console.warn("Could not delete project deployments:", e);
		}

		// Delete secret doc if exists
		try {
			await deleteDoc(doc(db, PROJECT_SECRETS_COLLECTION, projectId));
		} catch (e) {
			// Ignore if secret does not exist
		}

		// Delete main project doc
		await deleteDoc(doc(db, COLLECTION_NAME, projectId));
		return { success: true };
	} catch (error) {
		console.error("Error deleting project:", error);
		return { success: false, error: error.message || String(error) };
	}
};

export const adminUpdateProjectPassword = async (projectId, newPassword) => {
	try {
		const hashedPw = await hashPassword(newPassword);
		await setDoc(doc(db, PROJECT_SECRETS_COLLECTION, projectId), { password: hashedPw }, { merge: true });
		return { success: true };
	} catch (error) {
		console.error("Error updating project password:", error);
		return { success: false, error };
	}
};

export const getStudentsByGeneration = async (generation, { includeInactive = false } = {}) => {
	try {
		const q = query(
			collection(db, STUDENTS_COLLECTION),
			where("generation", "==", Number(generation))
		);
		const snap = await getDocs(q);
		return snap.docs
			.map(doc => ({ id: doc.id, ...doc.data() }))
			.filter(student => includeInactive || isStudentActive(student));
	} catch (error) {
		console.error("Error getting students by generation:", error);
		return [];
	}
};

const toStudentPageSize = (value) => {
	const size = Number(value);
	return Number.isInteger(size) && size > 0 && size <= 100 ? size : 20;
};

const findDuplicateStudent = async ({ generation, course, kor_name: korName, birthdate }, excludedId = null) => {
	const duplicateQuery = query(
		collection(db, STUDENTS_COLLECTION),
		where('generation', '==', generation),
		where('course', '==', course),
		where('kor_name', '==', korName),
		where('birthdate', '==', birthdate)
	);
	const snapshot = await getDocs(duplicateQuery);
	return snapshot.docs.find((studentDoc) => studentDoc.id !== excludedId) || null;
};

/**
 * 기수별 학생 목록을 Firestore 커서로 조회합니다.
 * cursor는 이전 응답의 lastCursor를 그대로 전달해야 합니다.
 */
export const getStudentsPage = async ({ generation, pageSize = 20, cursor = null } = {}) => {
	try {
		const safeGeneration = Number(generation);
		if (!Number.isInteger(safeGeneration) || safeGeneration <= 0) {
			throw new Error('유효한 기수를 선택해주세요.');
		}
		const safePageSize = toStudentPageSize(pageSize);
		const constraints = [
			where('generation', '==', safeGeneration),
			// 기존 테스트/레거시 학생도 name 필드는 가지고 있어 누락 없이 페이지에 포함됩니다.
			orderBy('name'),
			orderBy(documentId()),
			limit(safePageSize + 1)
		];
		if (cursor) constraints.splice(3, 0, startAfter(cursor));

		const [snapshot, countSnapshot] = await Promise.all([
			getDocs(query(collection(db, STUDENTS_COLLECTION), ...constraints)),
			getCountFromServer(query(collection(db, STUDENTS_COLLECTION), where('generation', '==', safeGeneration)))
		]);
		const hasNextPage = snapshot.docs.length > safePageSize;
		const pageDocs = snapshot.docs.slice(0, safePageSize);

		return {
			students: pageDocs.map((studentDoc) => ({ id: studentDoc.id, ...studentDoc.data() })),
			total: countSnapshot.data().count,
			hasNextPage,
			lastCursor: pageDocs.at(-1) || null
		};
	} catch (error) {
		console.error('Error getting paged students:', error);
		return { students: [], total: 0, hasNextPage: false, lastCursor: null, error };
	}
};

export const createStudent = async (input) => {
	try {
		const student = normalizeStudentInput(input);
		const duplicate = await findDuplicateStudent(student);
		if (duplicate) {
			return { success: false, error: '같은 기수·과정·국문명·생년월일의 학생이 이미 등록되어 있습니다.' };
		}

		const docRef = doc(collection(db, STUDENTS_COLLECTION));
		await setDoc(docRef, {
			...student,
			id: docRef.id,
			isAdmin: false,
			voteCount: 0,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		});
		return { success: true, student: { id: docRef.id, ...student, isAdmin: false, voteCount: 0 } };
	} catch (error) {
		console.error('Error creating student:', error);
		return { success: false, error: error.message || String(error) };
	}
};

export const updateStudent = async (studentId, input) => {
	try {
		if (!studentId) throw new Error('수정할 학생 정보가 없습니다.');
		const student = normalizeStudentInput(input);
		const duplicate = await findDuplicateStudent(student, studentId);
		if (duplicate) {
			return { success: false, error: '같은 기수·과정·국문명·생년월일의 학생이 이미 등록되어 있습니다.' };
		}

		await updateDoc(doc(db, STUDENTS_COLLECTION, studentId), {
			...student,
			updatedAt: serverTimestamp()
		});
		return { success: true, student: { id: studentId, ...student } };
	} catch (error) {
		console.error('Error updating student:', error);
		return { success: false, error: error.message || String(error) };
	}
};

export const getStudentDependencies = async (student) => {
	try {
		if (!student?.id) throw new Error('학생 정보가 없습니다.');
		const [votesSnapshot, projectsSnapshot] = await Promise.all([
			getDocs(query(collection(db, VOTES_COLLECTION), where('voterEmail', '==', student.id))),
			getDocs(query(collection(db, COLLECTION_NAME), where('members', 'array-contains', student.name)))
		]);
		return {
			success: true,
			voteCount: votesSnapshot.size,
			projectCount: projectsSnapshot.size
		};
	} catch (error) {
		console.error('Error getting student dependencies:', error);
		return { success: false, error: error.message || String(error) };
	}
};

export const deleteStudent = async (student) => {
	try {
		const dependencies = await getStudentDependencies(student);
		if (!dependencies.success) return dependencies;
		if (dependencies.voteCount > 0 || dependencies.projectCount > 0) {
			return {
				success: false,
				hasDependencies: true,
				error: `투표 ${dependencies.voteCount}건, 프로젝트 ${dependencies.projectCount}건과 연결되어 있어 삭제할 수 없습니다. 비활성화를 사용해주세요.`,
				dependencies
			};
		}
		await deleteDoc(doc(db, STUDENTS_COLLECTION, student.id));
		return { success: true };
	} catch (error) {
		console.error('Error deleting student:', error);
		return { success: false, error: error.message || String(error) };
	}
};



export const getMatchupsByGeneration = async (generation) => {
	try {
		const q = query(
			collection(db, MATCHUPS_COLLECTION),
			where("generation", "==", Number(generation))
		);
		const snap = await getDocs(q);
		return snap.docs.map(doc => doc.data());
	} catch (error) {
		console.error("Error getting matchups:", error);
		return [];
	}
};

export const syncVotingData = async (generation, initialElo = 1500, kFactor = 32) => {
	try {
		const safeInitialElo = Number.isInteger(Number(initialElo)) && Number(initialElo) > 0 ? Number(initialElo) : 1500;
		const safeKFactor = Number.isInteger(Number(kFactor)) && Number(kFactor) > 0 ? Number(kFactor) : 32;
		// 1. Get all votes for the generation
		const votesRef = collection(db, VOTES_COLLECTION);
		const votesQuery = query(votesRef, where("generation", "==", Number(generation)));
		const votesSnap = await getDocs(votesQuery);
		const allVotes = votesSnap.docs.map(doc => doc.data());

		// Sort chronologically to recompute ELO ratings correctly
		allVotes.sort((a, b) => {
			const tA = a.timestamp?.seconds || 0;
			const tB = b.timestamp?.seconds || 0;
			return tA - tB;
		});

		// 2. Fetch all projects for the generation
		const projectsRef = collection(db, COLLECTION_NAME);
		const projectsQuery = query(projectsRef, where("generation", "==", Number(generation)));
		const projectsSnap = await getDocs(projectsQuery);
		const projectsList = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

		// 3. Fetch all students for the generation
		const studentsRef = collection(db, STUDENTS_COLLECTION);
		const studentsQuery = query(studentsRef, where("generation", "==", Number(generation)));
		const studentsSnap = await getDocs(studentsQuery);
		const studentsList = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

		// 4. Initialize stats mapping
		const projectStats = {};
		projectsList.forEach(p => {
			projectStats[p.id] = { elo: safeInitialElo, wins: 0, losses: 0, totalMatches: 0 };
		});

		const studentStats = {};
		studentsList.forEach(s => {
			studentStats[s.id] = { voteCount: 0 };
		});

		const matchupStats = {};

		// 5. Recompute values
		allVotes.forEach(vote => {
			const { projectA, projectB, winner, voterEmail } = vote;

			if (!projectStats[projectA]) projectStats[projectA] = { elo: safeInitialElo, wins: 0, losses: 0, totalMatches: 0 };
			if (!projectStats[projectB]) projectStats[projectB] = { elo: safeInitialElo, wins: 0, losses: 0, totalMatches: 0 };

			if (voterEmail) {
				if (!studentStats[voterEmail]) studentStats[voterEmail] = { voteCount: 0 };
				studentStats[voterEmail].voteCount++;
			}

			const rA = projectStats[projectA].elo;
			const rB = projectStats[projectB].elo;

			const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
			const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));

			const sA = winner === projectA ? 1 : 0;
			const sB = winner === projectB ? 1 : 0;

			projectStats[projectA].elo = Math.round(rA + safeKFactor * (sA - eA));
			projectStats[projectB].elo = Math.round(rB + safeKFactor * (sB - eB));

			projectStats[projectA].totalMatches++;
			projectStats[projectB].totalMatches++;
			if (winner === projectA) {
				projectStats[projectA].wins++;
				projectStats[projectB].losses++;
			} else {
				projectStats[projectB].wins++;
				projectStats[projectA].losses++;
			}

			const pairId = [projectA, projectB].sort().join("_");
			if (!matchupStats[pairId]) {
				matchupStats[pairId] = {
					projectA,
					projectB,
					generation,
					winsA: 0,
					winsB: 0,
					total: 0
				};
			}
			matchupStats[pairId].total++;
			if (winner === projectA) {
				matchupStats[pairId].winsA++;
			} else {
				matchupStats[pairId].winsB++;
			}
		});

		// 6. Write aggregates to Firestore using Batch
		const batch = writeBatch(db);

		projectsList.forEach(p => {
			const stats = projectStats[p.id];
			if (stats) {
				const ref = doc(db, COLLECTION_NAME, p.id);
				batch.update(ref, stats);
			}
		});

		studentsList.forEach(s => {
			const stats = studentStats[s.id];
			const count = stats ? stats.voteCount : 0;
			const ref = doc(db, STUDENTS_COLLECTION, s.id);
			batch.update(ref, { voteCount: count });
		});

		Object.entries(matchupStats).forEach(([pairId, data]) => {
			const ref = doc(db, MATCHUPS_COLLECTION, pairId);
			batch.set(ref, data);
		});

		await batch.commit();
		return { success: true, voteCount: allVotes.length };
	} catch (error) {
		console.error("Sync voting data error:", error);
		return { success: false, error };
	}
};
