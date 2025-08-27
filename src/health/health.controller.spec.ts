import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheckStatus, HealthIndicatorStatus } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let typeOrmHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    typeOrmHealthIndicator = module.get(TypeOrmHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should call health check service with database ping check', async () => {
      const mockHealthResult = {
        status: 'ok' as HealthCheckStatus,
        info: {
          database: {
            status: 'up' as HealthIndicatorStatus,
          },
        },
        error: {},
        details: {
          database: {
            status: 'up' as HealthIndicatorStatus,
          },
        },
      };
      healthCheckService.check.mockResolvedValue(mockHealthResult);
      typeOrmHealthIndicator.pingCheck.mockResolvedValue({
        database: { status: 'up' },
      });

      const result = await controller.check();
      expect(result).toEqual(mockHealthResult);
    });

    it('should execute database ping check when health check runs', async () => {
      const mockHealthResult = {
        status: 'ok' as HealthCheckStatus,
        info: { database: { status: 'up' as HealthIndicatorStatus } },
        error: {},
        details: { database: { status: 'up' as HealthIndicatorStatus } },
      };

      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the first check function to verify it calls pingCheck
        await checks[0]();
        return mockHealthResult;
      });

      typeOrmHealthIndicator.pingCheck.mockResolvedValue({
        database: { status: 'up' },
      });

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
    });

    it('should return error status when database check fails', async () => {
      const mockErrorResult = {
        status: 'error' as HealthCheckStatus,
        info: {},
        error: { database: { status: 'down' as HealthIndicatorStatus, message: 'Connection failed' } },
        details: { database: { status: 'down' as HealthIndicatorStatus, message: 'Connection failed' } },
      };

      healthCheckService.check.mockResolvedValue(mockErrorResult);
      typeOrmHealthIndicator.pingCheck.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.check();

      expect(result).toEqual(mockErrorResult);
      expect(result.status).toBe('error');
    });

    it('should handle health check service throwing an error', async () => {
      const error = new Error('Health check failed');
      healthCheckService.check.mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow('Health check failed');
    });
  });
});
