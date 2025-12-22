const BAD_WORDS = [
	// Common Curse Words & Variations
	'시발', '씨발', '썅', '개새끼', '새끼', '좆', '좃', '씹', '병신', '빙신', '지랄', '염병',
	'젠장', '제기랄', '존나', '졸라', '엿먹어', '호로', '육시랄', '미친', '미친놈', '미친년',
	'닥쳐', '아가리', '꺼져', '나가뒤져', '뒤져', '자살', '살자', '죽어',
	'늬미', '니미', '느금마', '니애미', '느개비', '니애비', '엠창', '앰창',

	// Community Slang & Derogatory Terms (Gender, Age, etc.)
	'한남', '한남충', '김치녀', '된장녀', '맘충', '개독', '틀딱', '틀니', '급식', '급식충',
	'잼민이', '학식', '학식충', '지잡', '지잡대', '고졸', '백수', '히키', '찐따', '왕따',
	'아싸', '호구', '버러지', '벌레', '충', // often used as suffix like 'XX충'
	'일베', '메갈', '워마드', '홍어', '통구이', '절라디언', '개쌍도', // Regional/Political slurs
	'운지', '노무노무', // Problematic community terms

	// Sexual & Obscene
	'창녀', '창놈', '걸레', '따먹', '먹튀', '섹스', '자위', '딸딸이', '보지', '자지',
	'콘돔', '후장', '강간', '성폭행', '몰카', '야동',

	// English Slang & Bad Words
	'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'whore', 'slut', 'bastard',
	'damn', 'cunt', 'cock', 'sucker', 'idiot', 'stupid', 'moron', 'retard', 'loser',
	'nigger', 'nigga', 'faggot', 'homo'
];

export const checkProfanity = (text) => {
	if (!text) return false;
	const normalizedText = text.replace(/\s/g, ''); // Remove spaces to catch things like "개 새 끼"
	// Also check original text for exact matches
	return BAD_WORDS.some(word => text.includes(word) || normalizedText.includes(word));
};
