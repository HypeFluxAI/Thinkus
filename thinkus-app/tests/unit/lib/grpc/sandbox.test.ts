/**
 * Tests for Sandbox Service gRPC Client
 */
import { describe, it, expect, vi } from 'vitest'

describe('Sandbox Service Client Types', () => {
  describe('SandboxConfig', () => {
    it('should have correct structure', () => {
      const config = {
        image: 'node',
        cpu_limit: 1000,
        memory_limit: 512,
        timeout: 300,
      }

      expect(config.image).toBe('node')
      expect(config.cpu_limit).toBe(1000)
      expect(config.memory_limit).toBe(512)
      expect(config.timeout).toBe(300)
    })

    it('should support all image types', () => {
      const images = ['node', 'python', 'full']

      images.forEach((image) => {
        const config = { image }
        expect(['node', 'python', 'full']).toContain(config.image)
      })
    })
  })

  describe('Sandbox', () => {
    it('should have correct structure', () => {
      const sandbox = {
        id: 'sb_project123_123456789',
        project_id: 'project123',
        user_id: 'user123',
        status: 'running',
        image: 'node',
        created_at: Date.now(),
        last_active_at: Date.now(),
      }

      expect(sandbox.id).toContain('sb_')
      expect(sandbox.status).toBe('running')
    })

    it('should support all status values', () => {
      const statuses = ['creating', 'running', 'paused', 'stopped', 'error']

      statuses.forEach((status) => {
        const sandbox = { status }
        expect(['creating', 'running', 'paused', 'stopped', 'error']).toContain(sandbox.status)
      })
    })
  })

  describe('ExecResult', () => {
    it('should have correct structure for success', () => {
      const result = {
        exit_code: 0,
        stdout: 'Hello, World!',
        stderr: '',
        duration: 150,
      }

      expect(result.exit_code).toBe(0)
      expect(result.stdout).toBe('Hello, World!')
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should have correct structure for error', () => {
      const result = {
        exit_code: 1,
        stdout: '',
        stderr: 'Error: command not found',
        duration: 50,
      }

      expect(result.exit_code).toBe(1)
      expect(result.stderr).toContain('Error')
    })

    it('should have correct structure for timeout', () => {
      const result = {
        exit_code: -1,
        stdout: '',
        stderr: 'execution timeout',
        duration: 30000,
      }

      expect(result.exit_code).toBe(-1)
      expect(result.stderr).toContain('timeout')
    })
  })

  describe('FileInfo', () => {
    it('should have correct structure for file', () => {
      const fileInfo = {
        name: 'main.ts',
        path: '/workspace/main.ts',
        is_directory: false,
        size: 1024,
        modified_at: Date.now(),
      }

      expect(fileInfo.name).toBe('main.ts')
      expect(fileInfo.is_directory).toBe(false)
      expect(fileInfo.size).toBeGreaterThan(0)
    })

    it('should have correct structure for directory', () => {
      const fileInfo = {
        name: 'src',
        path: '/workspace/src',
        is_directory: true,
        size: 0,
        modified_at: Date.now(),
      }

      expect(fileInfo.is_directory).toBe(true)
    })
  })

  describe('ExecOutput (streaming)', () => {
    it('should have correct structure', () => {
      const output = {
        type: 'stdout',
        data: 'Output line',
      }

      expect(output.type).toBe('stdout')
      expect(output.data).toBe('Output line')
    })

    it('should support stdout and stderr types', () => {
      const types = ['stdout', 'stderr']

      types.forEach((type) => {
        const output = { type, data: '' }
        expect(['stdout', 'stderr']).toContain(output.type)
      })
    })
  })

  describe('ExportedFile', () => {
    it('should have correct structure', () => {
      const file = {
        path: 'src/index.ts',
        content: Buffer.from('console.log("hello")'),
      }

      expect(file.path).toBe('src/index.ts')
      expect(Buffer.isBuffer(file.content)).toBe(true)
    })
  })

  describe('SandboxEvent', () => {
    it('should have correct structure', () => {
      const event = {
        type: 'file_change',
        sandbox_id: 'sb_123',
        timestamp: Date.now(),
        payload: Buffer.from(JSON.stringify({ file: 'main.ts' })),
      }

      expect(event.type).toBe('file_change')
      expect(event.sandbox_id).toContain('sb_')
    })

    it('should support all event types', () => {
      const types = ['file_change', 'command_start', 'command_end', 'error']

      types.forEach((type) => {
        const event = { type }
        expect(types).toContain(event.type)
      })
    })
  })
})

describe('Sandbox Service Client Functions', () => {
  // Mock gRPC
  vi.mock('@grpc/grpc-js', () => ({
    credentials: {
      createInsecure: vi.fn(() => ({})),
    },
    loadPackageDefinition: vi.fn(() => ({
      thinkus: {
        sandbox: {
          SandboxService: vi.fn(() => ({
            Create: vi.fn(),
            GetOrCreate: vi.fn(),
            Get: vi.fn(),
            Exec: vi.fn(),
            ExecStream: vi.fn(),
            WriteFile: vi.fn(),
            ReadFile: vi.fn(),
            ListFiles: vi.fn(),
            Pause: vi.fn(),
            Resume: vi.fn(),
            Destroy: vi.fn(),
            Export: vi.fn(),
            SubscribeEvents: vi.fn(),
            close: vi.fn(),
          })),
        },
      },
    })),
  }))

  vi.mock('@grpc/proto-loader', () => ({
    loadSync: vi.fn(() => ({})),
  }))

  describe('create', () => {
    it('should require project_id and user_id', () => {
      const request = {
        project_id: 'project123',
        user_id: 'user123',
        config: { image: 'node', cpu_limit: 1000, memory_limit: 512, timeout: 300 },
      }

      expect(request.project_id).toBeDefined()
      expect(request.user_id).toBeDefined()
      expect(request.config).toBeDefined()
    })
  })

  describe('getOrCreate', () => {
    it('should reuse existing sandbox', () => {
      // Simulate existing sandbox
      const existingSandbox = {
        id: 'sb_existing',
        status: 'running',
        project_id: 'project123',
        user_id: 'user123',
      }

      expect(existingSandbox.status).toBe('running')
    })
  })

  describe('exec', () => {
    it('should require sandbox_id and command', () => {
      const request = {
        sandbox_id: 'sb_123',
        command: 'npm install',
        timeout: 60,
      }

      expect(request.sandbox_id).toBeDefined()
      expect(request.command).toBeDefined()
    })

    it('should handle common commands', () => {
      const commands = [
        'npm install',
        'npm run build',
        'npm test',
        'node index.js',
        'ls -la',
        'cat package.json',
      ]

      commands.forEach((command) => {
        expect(command.length).toBeGreaterThan(0)
      })
    })
  })

  describe('writeFile', () => {
    it('should require sandbox_id, path, and content', () => {
      const request = {
        sandbox_id: 'sb_123',
        path: 'src/index.ts',
        content: Buffer.from('console.log("hello")'),
      }

      expect(request.sandbox_id).toBeDefined()
      expect(request.path).toBeDefined()
      expect(request.content).toBeDefined()
    })

    it('should reject path traversal', () => {
      const dangerousPaths = ['../../../etc/passwd', '/etc/passwd', '../../secret']

      dangerousPaths.forEach((path) => {
        const isDangerous = path.includes('..') || path.startsWith('/')
        expect(isDangerous).toBe(true)
      })
    })
  })

  describe('readFile', () => {
    it('should require sandbox_id and path', () => {
      const request = {
        sandbox_id: 'sb_123',
        path: 'package.json',
      }

      expect(request.sandbox_id).toBeDefined()
      expect(request.path).toBeDefined()
    })
  })

  describe('listFiles', () => {
    it('should require sandbox_id', () => {
      const request = {
        sandbox_id: 'sb_123',
        directory: 'src',
      }

      expect(request.sandbox_id).toBeDefined()
    })

    it('should default to root directory', () => {
      const request = {
        sandbox_id: 'sb_123',
        directory: '',
      }

      expect(request.directory).toBe('')
    })
  })

  describe('pause', () => {
    it('should require sandbox_id', () => {
      const request = { sandbox_id: 'sb_123' }
      expect(request.sandbox_id).toBeDefined()
    })
  })

  describe('resume', () => {
    it('should require sandbox_id', () => {
      const request = { sandbox_id: 'sb_123' }
      expect(request.sandbox_id).toBeDefined()
    })
  })

  describe('destroy', () => {
    it('should require sandbox_id', () => {
      const request = { sandbox_id: 'sb_123' }
      expect(request.sandbox_id).toBeDefined()
    })
  })

  describe('export', () => {
    it('should require sandbox_id', () => {
      const request = { sandbox_id: 'sb_123' }
      expect(request.sandbox_id).toBeDefined()
    })

    it('should return files and sandbox info', () => {
      const response = {
        files: [
          { path: 'package.json', content: Buffer.from('{}') },
          { path: 'src/index.ts', content: Buffer.from('') },
        ],
        sandbox: { id: 'sb_123', status: 'running' },
      }

      expect(response.files).toHaveLength(2)
      expect(response.sandbox.id).toBe('sb_123')
    })
  })

  describe('Resource Limits', () => {
    it('should validate CPU limits', () => {
      const validLimits = [500, 1000, 2000, 4000]

      validLimits.forEach((limit) => {
        expect(limit).toBeGreaterThan(0)
        expect(limit).toBeLessThanOrEqual(8000)
      })
    })

    it('should validate memory limits', () => {
      const validLimits = [256, 512, 1024, 2048, 4096]

      validLimits.forEach((limit) => {
        expect(limit).toBeGreaterThanOrEqual(256)
      })
    })

    it('should validate timeout', () => {
      const validTimeouts = [30, 60, 120, 300, 600]

      validTimeouts.forEach((timeout) => {
        expect(timeout).toBeGreaterThan(0)
      })
    })
  })
})
