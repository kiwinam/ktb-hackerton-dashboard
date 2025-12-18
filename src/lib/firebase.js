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

import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";

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
