import { FormControl, FormLabel, Input, Textarea, Select, Button } from "@chakra-ui/react"
import { useForm, SubmitHandler } from "react-hook-form"

interface Inputs {
  email: string
  description: string
  issue: string
}

interface FormProps {
  onClose?: () => void,
}

const ResolutionForm = ({onClose}: FormProps) => {
    const {
      register,
      handleSubmit,
    } = useForm<Inputs>()
    
    const onSubmit: SubmitHandler<Inputs> = (data) => {   
      console.log(data)
      if(onClose) {
        onClose();
      }
    }

    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl paddingTop={1}>
          <FormLabel>Email</FormLabel>
          <Input type='email' {...register("email", { required: 'Email is required' })} />
        </FormControl>
        <FormControl paddingTop={1}>
          <FormLabel>Description</FormLabel>
          <Textarea
            placeholder='Please write a description of your problem here...'
            size='sm'
            {...register("description")}
          />
        </FormControl>
        <FormControl paddingTop={1}>
          <FormLabel>Issues</FormLabel>
          <Select placeholder='Select Issue' {...register("issue")}>
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </Select>
        </FormControl>
        <Button mt={4} bg={"#0044E1"} color="white" type="submit">
          Submit
        </Button>
      </form>
    )

}

export default ResolutionForm