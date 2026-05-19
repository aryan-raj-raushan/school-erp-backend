export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;

  static success<T>(data: T, message = 'Success', pagination?: PaginationMeta): ApiResponse<T> {
    const res = new ApiResponse<T>();
    res.success = true;
    res.message = message;
    res.data = data;
    res.pagination = pagination;
    return res;
  }

  static created<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
    return ApiResponse.success(data, message);
  }

  static noContent(message = 'Deleted successfully'): ApiResponse<null> {
    return ApiResponse.success(null, message);
  }
}

export class PaginationResponse<T> {
  items: T[];
  meta: PaginationMeta;

  static of<T>(
    items: T[],
    total: number,
    filters: { page?: number; limit?: number },
  ): PaginationResponse<T> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const res = new PaginationResponse<T>();
    res.items = items;
    res.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return res;
  }
}
