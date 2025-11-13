import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import dbConnect from '@/lib/mongodb';
import Class from '@/models/Class';

// GET - Get class details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await context.params;
    await dbConnect();

    const classData = await Class.findById(classId)
      .populate('instructorId', 'username email')
      .populate('learners', 'username email')
      .populate('quizzes');

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check if user has access
    const isInstructor = classData.instructorId._id.toString() === authResult.userId;
    const isLearner = classData.learners.some((l: any) => l._id.toString() === authResult.userId);

    if (!isInstructor && !isLearner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ class: classData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 });
  }
}

// PUT - Update class (instructor only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await context.params;
    await dbConnect();

    const classData = await Class.findById(classId);
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check if user is the instructor
    if (classData.instructorId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Only the instructor can update this class' }, { status: 403 });
    }

    const { name, description, isActive, addQuiz, removeQuiz } = await request.json();

    if (name !== undefined) classData.name = name.trim();
    if (description !== undefined) classData.description = description.trim();
    if (isActive !== undefined) classData.isActive = isActive;
    
    // Add quiz to class
    if (addQuiz !== undefined) {
      if (!classData.quizzes.includes(addQuiz)) {
        classData.quizzes.push(addQuiz);
      }
    }
    
    // Remove quiz from class
    if (removeQuiz !== undefined) {
      classData.quizzes = classData.quizzes.filter((qId: any) => qId.toString() !== removeQuiz);
    }

    await classData.save();

    const updatedClass = await Class.findById(classData._id)
      .populate('instructorId', 'username email')
      .populate('learners', 'username email');

    return NextResponse.json({ 
      class: updatedClass,
      message: 'Class updated successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

// DELETE - Delete class (instructor only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await context.params;
    await dbConnect();

    const classData = await Class.findById(classId);
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check if user is the instructor
    if (classData.instructorId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Only the instructor can delete this class' }, { status: 403 });
    }

    await Class.findByIdAndDelete(classId);

    return NextResponse.json({ message: 'Class deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}
