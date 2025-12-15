"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"

interface CustomTooltipProps {
  text: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ text, children, onClick }) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="text-left w-full hover:text-blue-900 transition-colors"
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-[300px] bg-blue-900/90 px-3 py-2 shadow-lg"
          sideOffset={5}
        >
          <p className="text-sm text-white whitespace-normal break-words leading-relaxed">
            {text}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CustomTooltip
