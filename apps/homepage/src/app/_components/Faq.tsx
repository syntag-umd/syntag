import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@radix-ui/react-accordion"


export default function Faq() {
  return (
    <Accordion type="single" collapsible className="w-full max-w-md mx-auto">
      <AccordionItem value="item-1">
        <AccordionTrigger>Question 1</AccordionTrigger>
        <AccordionContent>
          Answer 1
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Question 2</AccordionTrigger>
        <AccordionContent>
          Answer 2
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Question 3</AccordionTrigger>
        <AccordionContent>
          Answer 3
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}