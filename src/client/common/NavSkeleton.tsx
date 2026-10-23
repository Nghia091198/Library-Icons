import { Flex } from 'antd';

// Khối giữ chỗ cho danh sách điều hướng kèm số lượng (menu nhóm của gallery, bộ lọc của admin).
export function NavSkeleton({ count }: { count: number }) {
  return (
    <Flex vertical gap={6} style={{ padding: '12px 16px' }} aria-hidden="true">
      {Array.from({ length: count }, (_unused, index) => (
        <Flex key={index} align="center" justify="space-between" style={{ height: 40 }}>
          <div className="skeleton-block" style={{ height: 12, width: `${50 + ((index * 17) % 35)}%`, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ height: 20, width: 36, borderRadius: 10 }} />
        </Flex>
      ))}
    </Flex>
  );
}
