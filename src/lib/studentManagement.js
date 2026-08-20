export const STUDENT_COURSES = Object.freeze(['풀스택', '인공지능', '클라우드']);
export const STUDENT_STATUSES = Object.freeze(['active', 'inactive']);

export const isStudentActive = (student) => student?.status !== 'inactive';

const cleanText = (value) => String(value ?? '').trim();

export const normalizeStudentInput = (input = {}) => {
	const name = cleanText(input.name);
	const korName = cleanText(input.kor_name);
	const course = cleanText(input.course);
	const birthdate = cleanText(input.birthdate).replace(/\D/g, '');
	const generation = Number(input.generation);
	const status = cleanText(input.status || 'active');

	if (!name || name.length > 100) throw new Error('표시 이름은 1~100자로 입력해주세요.');
	if (!korName || korName.length > 50) throw new Error('국문 이름은 1~50자로 입력해주세요.');
	if (!STUDENT_COURSES.includes(course)) throw new Error('과정을 선택해주세요.');
	if (!/^\d{6}$/.test(birthdate)) throw new Error('생년월일은 6자리로 입력해주세요.');
	if (!Number.isInteger(generation) || generation <= 0) throw new Error('유효한 기수를 선택해주세요.');
	if (!STUDENT_STATUSES.includes(status)) throw new Error('유효한 상태를 선택해주세요.');

	return {
		name,
		kor_name: korName,
		course,
		birthdate,
		generation,
		status
	};
};
