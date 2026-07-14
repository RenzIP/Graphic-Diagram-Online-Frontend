import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/auth/callback', '/demo', '/dashboard'];

export function middleware(request) {
	const { pathname } = request.nextUrl;
	const isPublic =
		PUBLIC_ROUTES.some((route) => pathname === route) ||
		pathname.startsWith('/_next') ||
		pathname.startsWith('/api') ||
		pathname.startsWith('/editor/demo') ||
		pathname.startsWith('/editor/local-') ||
		pathname === '/favicon.svg' ||
		pathname === '/robots.txt';

	if (isPublic) return NextResponse.next();

	const token = request.cookies.get('auth_token')?.value;
	if (!token) {
		const url = request.nextUrl.clone();
		url.pathname = '/login';
		url.searchParams.set('redirect', pathname);
		return NextResponse.redirect(url);
	}

	try {
		const payload = token.split('.')[1];
		let normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
		// Add padding to prevent atob from throwing DOMException
		while (normalized.length % 4) {
			normalized += '=';
		}
		JSON.parse(atob(normalized));
		return NextResponse.next();
	} catch {
		const url = request.nextUrl.clone();
		url.pathname = '/login';
		url.search = '';
		const response = NextResponse.redirect(url);
		response.cookies.delete('auth_token');
		return response;
	}
}

export const config = {
	matcher: ['/((?!.*\\.).*)']
};
