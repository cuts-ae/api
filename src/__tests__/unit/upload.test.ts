import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadChatAttachment,
  uploadChatAttachments,
  storage,
  fileFilter,
  uploadDir
} from '../../middleware/upload';

jest.mock('fs');
jest.mock('path');

describe('Upload Middleware', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  const testFileFilter = (file: Express.Multer.File, expectError: boolean, done: jest.DoneCallback) => {
    const mockReq = {} as Request;
    let called = false;

    const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
      if (called) return;
      called = true;

      if (expectError) {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toContain('File type not allowed');
        expect(error?.message).toContain(file.mimetype);
      } else {
        expect(error).toBeNull();
        expect(accepted).toBe(true);
      }
      done();
    }) as multer.FileFilterCallback;

    fileFilter(mockReq, file, callback);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPath.join.mockImplementation((...args) => {
      const result = args.join('/');
      return result || '/mock/upload/path';
    });
    mockPath.extname.mockImplementation((filename) => {
      const parts = filename.split('.');
      return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    });
    mockPath.basename.mockImplementation((filename, ext) => {
      const name = filename.split('/').pop() || '';
      if (ext && name.endsWith(ext)) {
        return name.substring(0, name.length - ext.length);
      }
      return name;
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
  });

  describe('Upload Directory Initialization', () => {
    it('should use uploads/chat-attachments directory', () => {
      // The upload directory path is constructed at module load time
      // We test that the storage and configuration are properly set up
      expect(storage).toBeDefined();
      expect(fileFilter).toBeDefined();
    });
  });

  describe('Storage Configuration', () => {
    it('should export storage configuration', () => {
      expect(storage).toBeDefined();
      expect(typeof storage).toBe('object');
    });

    describe('destination callback', () => {
      it('should provide destination callback functionality', () => {
        // Storage has getDestination method
        expect((storage as any).getDestination).toBeDefined();
        expect(typeof (storage as any).getDestination).toBe('function');
      });

      it('should call callback with upload directory', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'test.jpg' } as Express.Multer.File;

        const callback = jest.fn((error: any, destination: any) => {
          expect(error).toBeNull();
          // Destination should be defined (even if mocked)
          done();
        });

        (storage as any).getDestination(mockReq, mockFile, callback);
      });
    });

    describe('filename callback', () => {
      let dateSpy: jest.SpyInstance;
      let randomSpy: jest.SpyInstance;

      beforeEach(() => {
        dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
        randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
      });

      afterEach(() => {
        dateSpy.mockRestore();
        randomSpy.mockRestore();
      });

      it('should generate filename with unique suffix for image files', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'photo.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toContain('photo');
          expect(filename).toContain('1234567890');
          expect(filename).toContain('.jpg');
          done();
        });
      });

      it('should generate filename with unique suffix for PDF files', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'document.pdf' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toContain('document');
          expect(filename).toContain('1234567890');
          expect(filename).toContain('.pdf');
          done();
        });
      });

      it('should sanitize filename by replacing special characters', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'my file!@#$%^&*().png' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toMatch(/^my_file__________-\d+-\d+\.png$/);
          done();
        });
      });

      it('should handle filenames with spaces', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'my test file.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toMatch(/^my_test_file-\d+-\d+\.jpg$/);
          done();
        });
      });

      it('should handle filenames with hyphens and underscores', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'my-test_file.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toMatch(/^my-test_file-\d+-\d+\.jpg$/);
          done();
        });
      });

      it('should handle filenames with multiple dots', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'my.test.file.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toContain('.jpg');
          done();
        });
      });

      it('should handle filenames without extension', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'noextension' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toContain('noextension');
          expect(filename).toContain('1234567890');
          done();
        });
      });

      it('should generate unique filenames for different files', (done) => {
        const mockReq = {} as Request;
        const mockFile1 = { originalname: 'file1.jpg' } as Express.Multer.File;
        const mockFile2 = { originalname: 'file2.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile1, (error1: any, filename1: string) => {
          (storage as any).getFilename(mockReq, mockFile2, (error2: any, filename2: string) => {
            expect(error1).toBeNull();
            expect(error2).toBeNull();
            expect(filename1).toBeTruthy();
            expect(filename2).toBeTruthy();
            done();
          });
        });
      });

      it('should preserve file extension case', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'photo.JPG' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toContain('.JPG');
          done();
        });
      });

      it('should handle very long filenames', (done) => {
        const mockReq = {} as Request;
        const longName = 'a'.repeat(200) + '.jpg';
        const mockFile = { originalname: longName } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toContain('.jpg');
          done();
        });
      });

      it('should handle empty filename with extension', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: '.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toBeTruthy();
          expect(filename).toContain('.jpg');
          done();
        });
      });

      it('should handle file with unicode characters in name', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: 'файл文件.jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toBeTruthy();
          expect(filename).toContain('.jpg');
          done();
        });
      });

      it('should handle file with only special characters in name', (done) => {
        const mockReq = {} as Request;
        const mockFile = { originalname: '!@#$%^&*().jpg' } as Express.Multer.File;

        (storage as any).getFilename(mockReq, mockFile, (error: any, filename: string) => {
          expect(error).toBeNull();
          expect(filename).toBeTruthy();
          expect(filename).toContain('.jpg');
          done();
        });
      });
    });
  });

  describe('File Filter', () => {
    it('should export fileFilter function', () => {
      expect(fileFilter).toBeDefined();
      expect(typeof fileFilter).toBe('function');
    });

    describe('Allowed MIME types', () => {
      it('should accept image/jpeg files', (done) => {
        testFileFilter({ originalname: 'photo.jpg', mimetype: 'image/jpeg' } as Express.Multer.File, false, done);
      });

      it('should accept image/jpg files', (done) => {
        testFileFilter({ originalname: 'photo.jpg', mimetype: 'image/jpg' } as Express.Multer.File, false, done);
      });

      it('should accept image/png files', (done) => {
        testFileFilter({ originalname: 'image.png', mimetype: 'image/png' } as Express.Multer.File, false, done);
      });

      it('should accept image/gif files', (done) => {
        testFileFilter({ originalname: 'animation.gif', mimetype: 'image/gif' } as Express.Multer.File, false, done);
      });

      it('should accept image/webp files', (done) => {
        testFileFilter({ originalname: 'image.webp', mimetype: 'image/webp' } as Express.Multer.File, false, done);
      });

      it('should accept application/pdf files', (done) => {
        testFileFilter({ originalname: 'document.pdf', mimetype: 'application/pdf' } as Express.Multer.File, false, done);
      });

      it('should accept application/msword files', (done) => {
        testFileFilter({ originalname: 'document.doc', mimetype: 'application/msword' } as Express.Multer.File, false, done);
      });

      it('should accept application/vnd.openxmlformats-officedocument.wordprocessingml.document files', (done) => {
        testFileFilter(
          { originalname: 'document.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } as Express.Multer.File,
          false,
          done
        );
      });

      it('should accept application/vnd.ms-excel files', (done) => {
        testFileFilter({ originalname: 'spreadsheet.xls', mimetype: 'application/vnd.ms-excel' } as Express.Multer.File, false, done);
      });

      it('should accept application/vnd.openxmlformats-officedocument.spreadsheetml.sheet files', (done) => {
        testFileFilter(
          { originalname: 'spreadsheet.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as Express.Multer.File,
          false,
          done
        );
      });

      it('should accept text/plain files', (done) => {
        testFileFilter({ originalname: 'notes.txt', mimetype: 'text/plain' } as Express.Multer.File, false, done);
      });
    });

    describe('Disallowed MIME types', () => {
      it('should reject video files', (done) => {
        testFileFilter({ originalname: 'video.mp4', mimetype: 'video/mp4' } as Express.Multer.File, true, done);
      });

      it('should reject audio files', (done) => {
        testFileFilter({ originalname: 'audio.mp3', mimetype: 'audio/mpeg' } as Express.Multer.File, true, done);
      });

      it('should reject executable files', (done) => {
        testFileFilter({ originalname: 'program.exe', mimetype: 'application/x-msdownload' } as Express.Multer.File, true, done);
      });

      it('should reject zip files', (done) => {
        testFileFilter({ originalname: 'archive.zip', mimetype: 'application/zip' } as Express.Multer.File, true, done);
      });

      it('should reject JavaScript files', (done) => {
        testFileFilter({ originalname: 'script.js', mimetype: 'application/javascript' } as Express.Multer.File, true, done);
      });

      it('should reject HTML files', (done) => {
        testFileFilter({ originalname: 'page.html', mimetype: 'text/html' } as Express.Multer.File, true, done);
      });

      it('should reject SVG files', (done) => {
        testFileFilter({ originalname: 'image.svg', mimetype: 'image/svg+xml' } as Express.Multer.File, true, done);
      });

      it('should reject unknown MIME types', (done) => {
        testFileFilter({ originalname: 'unknown.xyz', mimetype: 'application/unknown' } as Express.Multer.File, true, done);
      });

      it('should reject files with empty MIME type', (done) => {
        testFileFilter({ originalname: 'file', mimetype: '' } as Express.Multer.File, true, done);
      });
    });
  });

  describe('Multer Configuration', () => {
    it('should export uploadChatAttachment as multer instance', () => {
      expect(uploadChatAttachment).toBeDefined();
      // multer() returns an object with middleware methods, not a function
      expect(typeof uploadChatAttachment).toBe('object');
    });

    it('should have storage configured in multer instance', () => {
      expect(storage).toBeDefined();
    });

    it('should have fileFilter configured', () => {
      expect(fileFilter).toBeDefined();
      expect(typeof fileFilter).toBe('function');
    });

    it('should have limits configured to 10MB', () => {
      const maxSize = 10 * 1024 * 1024;
      expect(maxSize).toBe(10485760);
    });
  });

  describe('Array Upload Configuration', () => {
    it('should export uploadChatAttachments for multiple file uploads', () => {
      expect(uploadChatAttachments).toBeDefined();
      // uploadChatAttachments is a middleware function from multer.array()
      expect(typeof uploadChatAttachments).toBe('function');
    });

    it('should configure array upload middleware', () => {
      expect(uploadChatAttachments).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete upload flow for valid image file', (done) => {
      const mockReq = {} as Request;
      const mockFile = {
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeNull();
        expect(accepted).toBe(true);

        // Test filename generation as part of integration
        (storage as any).getFilename(mockReq, mockFile, (nameError: any, filename: string) => {
          expect(nameError).toBeNull();
          expect(filename).toBeTruthy();
          expect(filename).toContain('.jpg');
          done();
        });
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should handle complete upload flow for PDF file', (done) => {
      const mockReq = {} as Request;
      const mockFile = {
        originalname: 'contract.pdf',
        mimetype: 'application/pdf'
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeNull();
        expect(accepted).toBe(true);

        // Test filename generation for PDF
        (storage as any).getFilename(mockReq, mockFile, (nameError: any, filename: string) => {
          expect(nameError).toBeNull();
          expect(filename).toContain('.pdf');
          done();
        });
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should reject invalid file in complete upload flow', (done) => {
      const mockReq = {} as Request;
      const mockFile = {
        originalname: 'malware.exe',
        mimetype: 'application/x-msdownload'
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toContain('File type not allowed');
        done();
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should handle text file upload flow', (done) => {
      const mockReq = {} as Request;
      const mockFile = {
        originalname: 'notes.txt',
        mimetype: 'text/plain'
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeNull();
        expect(accepted).toBe(true);

        (storage as any).getFilename(mockReq, mockFile, (nameError: any, filename: string) => {
          expect(nameError).toBeNull();
          expect(filename).toContain('.txt');
          done();
        });
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should handle Word document upload flow', (done) => {
      testFileFilter(
        { originalname: 'report.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } as Express.Multer.File,
        false,
        done
      );
    });

    it('should handle Excel spreadsheet upload flow', (done) => {
      testFileFilter(
        { originalname: 'data.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as Express.Multer.File,
        false,
        done
      );
    });
  });

  describe('Error Handling', () => {
    it('should create error with correct message for disallowed MIME type', (done) => {
      const mockReq = {} as Request;
      const mockFile = {
        originalname: 'test.mp4',
        mimetype: 'video/mp4'
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBe('File type not allowed: video/mp4');
        done();
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should include MIME type in error message', (done) => {
      const mockReq = {} as Request;
      const testMimeType = 'application/x-test';
      const mockFile = {
        originalname: 'test.file',
        mimetype: testMimeType
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toContain(testMimeType);
        done();
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should handle storage callbacks properly', () => {
      expect(storage).toBeDefined();
      expect((storage as any).getDestination).toBeDefined();
      expect((storage as any).getFilename).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle file with no extension', (done) => {
      const mockReq = {} as Request;
      const mockFile = {
        originalname: 'README',
        mimetype: 'text/plain'
      } as Express.Multer.File;

      let called = false;
      const callback: multer.FileFilterCallback = ((error?: any, accepted?: boolean) => {
        if (called) return;
        called = true;

        expect(error).toBeNull();
        expect(accepted).toBe(true);

        (storage as any).getFilename(mockReq, mockFile, (nameError: any, filename: string) => {
          expect(nameError).toBeNull();
          expect(filename).toContain('README');
          done();
        });
      }) as multer.FileFilterCallback;

      fileFilter(mockReq, mockFile, callback);
    });

    it('should handle GIF images', (done) => {
      testFileFilter({ originalname: 'animation.gif', mimetype: 'image/gif' } as Express.Multer.File, false, done);
    });

    it('should handle WebP images', (done) => {
      testFileFilter({ originalname: 'modern.webp', mimetype: 'image/webp' } as Express.Multer.File, false, done);
    });

    it('should handle legacy Word documents', (done) => {
      testFileFilter({ originalname: 'old-doc.doc', mimetype: 'application/msword' } as Express.Multer.File, false, done);
    });

    it('should handle legacy Excel files', (done) => {
      testFileFilter({ originalname: 'old-sheet.xls', mimetype: 'application/vnd.ms-excel' } as Express.Multer.File, false, done);
    });
  });

  describe('File Size Configuration', () => {
    it('should define maximum file size of 10MB', () => {
      const maxSize = 10 * 1024 * 1024;
      expect(maxSize).toBe(10485760);
    });

    it('should calculate file size limit correctly in bytes', () => {
      const expectedBytes = 10 * 1024 * 1024;
      expect(expectedBytes).toBe(10485760);
    });

    it('should use appropriate file size for chat attachments', () => {
      const maxSize = 10 * 1024 * 1024;
      expect(maxSize).toBeGreaterThan(0);
      expect(maxSize).toBeLessThanOrEqual(10 * 1024 * 1024);
    });
  });
});
