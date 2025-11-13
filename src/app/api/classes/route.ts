import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import dbConnect from '@/lib/mongodb';
import Class from '@/models/Class';

// Helper function to generate unique class code
function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET - Get all classes for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let classes;
    if (authResult.user.role === 'instructor') {
      // Get classes created by instructor
      classes = await Class.find({ instructorId: authResult.userId })
        .populate('instructorId', 'username email')
        .populate('learners', 'username email')
        .sort({ createdAt: -1 });
    } else {
      // Get classes joined by learner
      classes = await Class.find({ learners: authResult.userId, isActive: true })
        .populate('instructorId', 'username email')
        .sort({ createdAt: -1 });
    }

    return NextResponse.json({ classes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

// POST - Create a new class (instructors only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Only instructors can create classes' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    await dbConnect();

    // Generate unique class code
    let classCode = generateClassCode();
    let isUnique = false;
    
    // Ensure code is unique
    while (!isUnique) {
      const existing = await Class.findOne({ classCode });
      if (!existing) {
        isUnique = true;
      } else {
        classCode = generateClassCode();
      }
    }

    const newClass = await Class.create({
      name: name.trim(),
      description: description?.trim() || '',
      classCode,
      instructorId: authResult.userId,
      learners: [],
      quizzes: []
    });

    const populatedClass = await Class.findById(newClass._id)
      .populate('instructorId', 'username email');

    return NextResponse.json({ 
      class: populatedClass,
      message: 'Class created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
