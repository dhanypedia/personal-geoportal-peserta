import { Box } from '@mui/material'
import React from 'react'
import BuatData from './BuatData'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const page = async () => {
    const session = await getServerSession(authOptions);
      if (session.user.role === "viewer") {
        redirect("/");
      }
    return (
        <Box sx={{ color: "black" }}>
            <BuatData />
        </Box>
    )
}

export default page