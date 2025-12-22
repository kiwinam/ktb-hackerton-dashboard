import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				'kakao-yellow': '#FEE500',
				'kakao-black': '#191919',
				'kakao-gray': '#e5e5e5', // Light gray background often used
			},
		},
	},
	plugins: [
		typography,
	],
}
