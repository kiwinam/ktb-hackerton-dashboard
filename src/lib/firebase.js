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

import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDoc, arrayUnion, arrayRemove, deleteDoc, increment, getCountFromServer } from "firebase/firestore";

const COLLECTION_NAME = "projects";

export const addProject = async (projectData) => {
	try {
		await addDoc(collection(db, COLLECTION_NAME), {
			...projectData,
			likes: 0,
			likedBy: [], // Array of session IDs
			createdAt: serverTimestamp(),
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
			const projects = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
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
		await addDoc(collection(db, COLLECTION_NAME, projectId, "comments"), {
			...commentData,
			createdAt: serverTimestamp(),
		});

		// Update comment count on project document
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
		const comments = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
		callback(comments);
	});
};

export const deleteComment = async (projectId, commentId, password) => {
	try {
		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);
		const commentSnap = await getDoc(commentRef);

		if (commentSnap.exists()) {
			const data = commentSnap.data();
			if (data.password === password) {
				await deleteDoc(commentRef);

				// Update comment count on project document
				const projectRef = doc(db, COLLECTION_NAME, projectId);
				await updateDoc(projectRef, {
					commentCount: increment(-1)
				});

				return { success: true };
			} else {
				return { success: false, error: "Incorrect password" };
			}
		} else {
			return { success: false, error: "Comment not found" };
		}
	} catch (error) {
		console.error("Error deleting comment: ", error);
		return { success: false, error };
	}
};

export const updateComment = async (projectId, commentId, password, newContent) => {
	try {
		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);
		const commentSnap = await getDoc(commentRef);

		if (commentSnap.exists()) {
			const data = commentSnap.data();
			if (data.password === password) {
				await updateDoc(commentRef, {
					content: newContent,
					updatedAt: serverTimestamp()
				});
				return { success: true };
			} else {
				return { success: false, error: "Incorrect password" };
			}
		} else {
			return { success: false, error: "Comment not found" };
		}
	} catch (error) {
		console.error("Error updating comment: ", error);
		return { success: false, error };
	}
};

export const verifyCommentPassword = async (projectId, commentId, password) => {
	try {
		const commentRef = doc(db, COLLECTION_NAME, projectId, "comments", commentId);
		const commentSnap = await getDoc(commentRef);

		if (commentSnap.exists()) {
			const data = commentSnap.data();
			if (data.password === password) {
				return { success: true };
			} else {
				return { success: false, error: "Incorrect password" };
			}
		} else {
			return { success: false, error: "Comment not found" };
		}
	} catch (error) {
		console.error("Error verifying password: ", error);
		return { success: false, error };
	}
};

export const syncCommentCounts = async () => {
	try {
		const projectsQuery = query(collection(db, COLLECTION_NAME));
		const snapshot = await getCountFromServer(projectsQuery); // Just to check connectivity or basic read? No, need docs.

		// We need to fetch all projects first
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
