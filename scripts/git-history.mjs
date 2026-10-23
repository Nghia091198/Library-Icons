import { execFileSync } from 'node:child_process';

// Chỉ đọc lịch sử git: danh sách commit, nhánh hiện tại, remote, trạng thái đồng bộ và nội dung commit mới nhất.
const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return `(lỗi: ${error.stderr?.toString().trim() || error.message})`;
  }
};

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
console.log(`Nhánh: ${branch}`);
console.log(`Remote: ${git('remote', '-v') || '(chưa có)'}`);
console.log(`Nhánh theo dõi trên remote: ${git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')}`);
console.log(`Chưa commit: ${git('status', '--porcelain') || '(không có)'}`);
console.log(`Số commit: ${git('rev-list', '--count', 'HEAD')}`);
console.log('');
console.log('== Commit mới nhất: các file thay đổi');
console.log(git('show', '--stat', '--format=%h %s', 'HEAD'));
console.log('');
console.log('== Kiểm tra file nhạy cảm có nằm trong lịch sử git không');
console.log(git('log', '--all', '--name-only', '--format=', '--', '.env', '*.env', '*.log', 'node_modules', 'dist') || '(không có)');
