export default function Footbar() {
	return (
		<footer className="flex items-center justify-between text-sm border-t border-slate-200 bg-white px-6 py-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
			<span>© {new Date().getFullYear()} HRIS. All rights reserved.</span>
			<span >Created by Iemaduddin</span>
		</footer>
	);
}
