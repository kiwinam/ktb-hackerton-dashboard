import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
	apiKey: "AIzaSyDvN5qlgbSVh0vcxAC1e2omE3kCAYh_PaE",
	authDomain: "ktb-hackerton.firebaseapp.com",
	projectId: "ktb-hackerton",
	storageBucket: "ktb-hackerton.firebasestorage.app",
	messagingSenderId: "839971246632",
	appId: "1:839971246632:web:936044809239ead4ed5b1d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import { collection, addDoc, onSnapshot, query, setDoc, orderBy, serverTimestamp, doc, updateDoc, getDoc, arrayUnion, arrayRemove, deleteDoc, increment, getCountFromServer } from "firebase/firestore";
import { hashPassword } from "./crypto";

const COLLECTION_NAME = "projects";
const PROJECT_SECRETS_COLLECTION = "project_secrets";
const COMMENT_SECRETS_COLLECTION = "comment_secrets";

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

export const verifyCommentPassword = async (projectId, commentId, password) => {
	try {
		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);
		const isValid = await _verifySecret(COMMENT_SECRETS_COLLECTION, commentId, password, commentRef);

		if (isValid) {
			return { success: true };
		} else {
			return { success: false, error: "Incorrect password" };
		}
	} catch (error) {
		console.error("Error verifying password: ", error);
		return { success: false, error };
	}
};

export const verifyProjectPassword = async (projectId, password) => {
	try {
		const projectRef = doc(db, COLLECTION_NAME, projectId);
		const isValid = await _verifySecret(PROJECT_SECRETS_COLLECTION, projectId, password, projectRef);

		if (isValid) {
			return { success: true };
		} else {
			return { success: false, error: "Incorrect password" };
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

export const migrateLegacyData = async () => {
	console.log("Starting migration...");
	try {
		const projectsQuery = query(collection(db, COLLECTION_NAME));
		const projectsSnap = await import("firebase/firestore").then(mod => mod.getDocs(projectsQuery));
		let pCount = 0;
		let cCount = 0;

		for (const projectDoc of projectsSnap.docs) {
			const pData = projectDoc.data();

			// Migrate Project Password
			if (pData.password) {
				const hashedPassword = await hashPassword(pData.password);
				await setDoc(doc(db, PROJECT_SECRETS_COLLECTION, projectDoc.id), {
					password: hashedPassword
				});

				// Remove raw password
				// Dynamically import deleteField to avoid top-level import clutter if not present
				const { deleteField } = await import("firebase/firestore");
				await updateDoc(doc(db, COLLECTION_NAME, projectDoc.id), {
					password: deleteField()
				});
				pCount++;
			}

			// Migrate Comments
			const commentsRef = collection(db, COLLECTION_NAME, projectDoc.id, "comments");
			const commentsSnap = await import("firebase/firestore").then(mod => mod.getDocs(commentsRef));

			for (const commentDoc of commentsSnap.docs) {
				const cData = commentDoc.data();
				if (cData.password) {
					const hashedPassword = await hashPassword(cData.password);
					await setDoc(doc(db, COMMENT_SECRETS_COLLECTION, commentDoc.id), {
						password: hashedPassword,
						projectId: projectDoc.id
					});

					const { deleteField } = await import("firebase/firestore");
					await updateDoc(doc(db, COLLECTION_NAME, projectDoc.id, "comments", commentDoc.id), {
						password: deleteField()
					});
					cCount++;
				}
			}
		}
		console.log(`Migration complete. Projects: ${pCount}, Comments: ${cCount}`);
		return { success: true, pCount, cCount };
	} catch (error) {
		console.error("Migration failed:", error);
		return { success: false, error };
	}
};
