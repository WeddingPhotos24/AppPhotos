import React, { useEffect, useRef, useState } from 'react';
import ReactAudioPlayer from 'react-audio-player';
import { DeleteIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  Divider,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  DrawerCloseButton,
  useDisclosure,
  SimpleGrid,
  Text,
  useToast,
  HStack,
  Spinner,
} from '@chakra-ui/react';
import { gapi } from 'gapi-script';
import "react-responsive-carousel/lib/styles/carousel.min.css"; 
import { Carousel } from 'react-responsive-carousel';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';

const CLIENT_ID = '961171182933-qvm6ko3ahn46bi8hbdhin3r45el7t2ii.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1SqKQVyN-Qv9Sftp2OXOIVe9j_oEdRdwT';
const API_KEY = 'AIzaSyCaJtdq24hXZuslhZ9R3BCPySNjmetk130'


function App() {
  const fileInputRef = useRef();
  const [files, setFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [isFileSelected,setIsFileSelected] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

 
  const toast = useToast()
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        clientId: CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: SCOPES,
      }).then(() => {
        const authInstance = gapi.auth2.getAuthInstance();
        authInstance.isSignedIn.listen(updateSignInStatus);
        updateSignInStatus(authInstance.isSignedIn.get());
        setIsLoading(false)
      });
    };

    gapi.load('client:auth2', initClient);
  }, []);

  const updateSignInStatus = (isSignedIn) => {
    setIsSignedIn(isSignedIn);
    if (isSignedIn) {
      const user = gapi.auth2.getAuthInstance().currentUser.get();
      setUserProfile(user.getBasicProfile());
      fetchFiles();
    } else {
      setUserProfile(null);
    }
  };

  const handleFileChange = (event) => {
    setIsFileSelected(event.target.files.length > 0);
  };
  
  const handleAuthClick = () => {
    gapi.auth2.getAuthInstance().signIn().catch(error => {
      console.error('Error signing in', error);
    });
  };

  const handleSignOutClick = () => {
    gapi.auth2.getAuthInstance().signOut().then(() => {
      setIsSignedIn(false);
      setUserProfile(null);
    });
  };

  const handleFileUpload = () => {
    const files = fileInputRef.current.files;
    if (files.length > 0) {
      const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

      Array.from(files).forEach(file => {
        const metadata = {
          name: file.name,
          mimeType: file.type,
          parents: [FOLDER_ID],
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
          body: form,
        })
          .then((response) => response.json())
          .then((data) => {
            console.log(data);
            toast({
              title: 'Archivo subido',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            fetchFiles(); // Actualiza la lista de archivos después de subir uno nuevo
            setIsFileSelected(false); 
            fileInputRef.current.value="";
          })
          .catch((error) => {
            console.error('Error uploading file', error);
            toast({
              title: 'Error al subir el archivo',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          });
      });
    }
  };

  const fetchFiles = () => {
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    gapi.client.drive.files.list({
      q: `'${FOLDER_ID}' in parents`,
      fields: 'files(id, name, mimeType)',
    }).then(async (response) => {
      const files = response.result.files || [];
      const fileBlobs = await Promise.all(files.map(async (file) => {
        const blob = await fetchFileBlob(file.id, accessToken);        
        return { ...file, blobUrl: URL.createObjectURL(blob) };
      }));
      setFiles(fileBlobs);
      console.log(files)
    }).catch((error) => {
      console.error('Error fetching files', error);
      alert('Error al obtener los archivos');
    });
  };

  const fetchFileBlob = async (fileId, accessToken) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    });
    return response.blob();
  };

  const handleImageClick = (blobUrl,fileId) => {
    setSelectedImage(blobUrl);
    setImageToDelete(fileId)
    onOpen();
  };

  const handleFileDelete = (fileId) => {
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;    
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {      
      method: 'DELETE',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    })
      .then(() => {
        toast({
          title: 'Imagen eliminada',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onClose();
        fetchFiles(); // Actualiza la lista de archivos después de eliminar uno
      })
      .catch((error) => {
        console.error('Error deleting file', error);
        toast({
          title: 'Error al borrar imágen',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const confirmDelete = () => {
    handleFileDelete(imageToDelete);
    setIsConfirmOpen(false);
  };

  if(isLoading){
    return <Container 
    position={"center"} 
    centerContent   
   
    w={{ base: "full", md: "100%" }}  
    h={{ base:"full",md: "100%"}}
    minH="100vh"
    borderRadius="md"
    backgroundSize= {{base :"contain", md: "contain"}}
    backgroundRepeat={'no-repeat'}
       
  ><Spinner size="xl" position="absolute" top="50%" left="45%"/></Container>
    
    
  }
  return (
    
    <Container 
    position={"center"} 
    centerContent   
   
    w={{ base: "full", md: "100%" }}  
    h={{ base:"full",md: "100%"}}
    minH="100vh"
    borderRadius="md" 
    backgroundSize= {{base :"contain", md: "contain"}}
    backgroundRepeat={'no-repeat'}
       
  >
      <Image  w={{base:"100%",md:"30%"}} h="100%" zIndex="-1" position="absolute" src="https://i.ibb.co/gzLMG5X/rym.jpg"></Image>
      <Box 
        padding="4"
        bg="rgba(255, 255, 255, .7) "
        borderRadius="md"
        mt={{base:"110px",md:"160px"}}
        h="100%"
        w="auto"
       
      >
        {!isSignedIn ? (
          <VStack spacing={4}>
            <Heading fontSize="20px" as="h1" size="xl">Inicia sesión para subir y ver fotos</Heading>
            <Button colorScheme="blue" onClick={handleAuthClick}>Iniciar Sesión en Google</Button>
          </VStack>
        ) : (
          <>
            <VStack spacing={4}>
              <Heading fontFamily="monospace" fontSize="17px" as="h1" size="xl">¡Recordemos este día juntos!</Heading>             
              <Input border="none" type="file" ref={fileInputRef} multiple onChange={handleFileChange}/>        
              <Button w="125px" bg="#8c9d50" color="white" disabled={isFileSelected} onClick={handleFileUpload}>Subir</Button>                            
            </VStack>
            <Tabs isFitted variant="enclosed" mt={4}>
              
              <TabList mb="1em">
                <Tab  onClick={fetchFiles}>Tus fotos</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                
                <Box
                  justifyContent="center"
                  maxW="320px" 
                  height="auto"  // Tamaño fijo para el contenedor principal
                  overflowX="auto" // Permite el desplazamiento horizontal
                  whiteSpace="nowrap" // Mantiene las imágenes en una fila horizontal
                >
                  {files.length === 0 && (
                    <VStack justifyItems="center" mt="10px" mb="40px">
                    <Text fontSize="12px" color="black">Aún no has subido ningún archivo</Text>
                    </VStack>
                  )}
                  
                  {files.map(file => (
                    <Box
                      
                      alignContent="center"
                      display="inline-block"
                      //border="1px solid black"
                      width="100px"
                      height="100px"
                      key={file.id}
                      position="relative"
                      overflow="hidden"
                      mr={2} // Margen derecho para separar las imágenes
                    >                   
                      
                      
                      
                      <Image 
                        
                        src={file.blobUrl}
                        alt={file.name}
                        onClick={() => handleImageClick(file.blobUrl,file.id)}
                        cursor="pointer"
                      />
                    </Box>
                    
                  ))}
                </Box>

                </TabPanel>
              </TabPanels>
            </Tabs>
            <VStack>
            {userProfile && (
                <Text fontFamily="monospace">Conectado como: ({userProfile.getEmail()})</Text>
              )}
              <Button colorScheme="red" onClick={handleSignOutClick}>Cerrar Sesión</Button>
          </VStack>
          </>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent
          display="flex"
          justifyContent="center"
          alignItems="center"
          bg="rgba(0, 0, 0, .7)"
          boxShadow="none"
          animation="scaleUp 0.3s ease-in-out"
        >
          
          <IconButton
            icon={<DeleteIcon />}
            colorScheme="red"
            onClick={() => handleFileDelete(imageToDelete)}
            position="absolute"
            top="10px"
            left="10px" 
            zIndex="2"            
            size="sm"
          />
          <ModalCloseButton color="white" bg="red" />
          <ModalBody display="flex" justifyContent="center" alignItems="center">
            {selectedImage && (
              <Image src={selectedImage} alt="Selected" maxW="100vw" maxH="100vh" />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default App;
