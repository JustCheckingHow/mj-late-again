import React from 'react';
import { styled } from '@material-ui/core/styles';

const Container = styled('div')(({ theme }) => {

  return {
    position: 'relative',
    height: '100%',
    background: 'blue',
   };
});

export default function Map() {
  return (
    <Container />
  );
}
